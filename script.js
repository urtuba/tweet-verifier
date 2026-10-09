import { TweetError, fetchTweet, formatMillis, formatSeconds, isRecordId, parseTweetUrl } from "./tweet.js";

const WELCOME = "Welcome! Please enter a Tweet URL or Record ID to start using TWEET VERIFIER.";

// Values shown with v-html must be escaped first.
const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const message = (text) => `<p>${escapeHtml(text)}</p>`;

new Vue({
    el : "#app",
    data : {
        link_or_record : "",
        content : WELCOME,
        // Status of the local EVM: "starting", "ready" or "error"
        evm_state : "starting",
        evm_note : "starting (the first visit takes a few seconds)...",
        active : false,
        busy : false,
        account : '',
        contract : undefined
    },
    created() {
        this.start_evm()
    },
    methods : {
        async start_evm() {
            try {
                const { startLocalEvm } = await import("./evm.js")
                const evm = await startLocalEvm()
                this.account = evm.account
                this.contract = evm.contract
                this.active = true
                this.evm_state = "ready"
                this.evm_note = evm.persisted ? "ready (records are saved in this browser)" : "ready (records are lost on reload)"
            } catch (error) {
                console.error(error)
                this.evm_state = "error"
                this.evm_note = "failed to start"
                this.content = message("The local EVM could not start: " + (error && error.message || error))
            }
        },
        // Enter key: a tweet URL is saved, a record id is queried.
        enter() {
            if (this.busy || !this.active) return
            if (parseTweetUrl(this.link_or_record)) {
                this.submit_tweet()
            } else if (isRecordId(this.link_or_record)) {
                this.getTweet()
            } else {
                this.content = message("Enter a tweet URL to save it, or a record ID (0x and 64 hex digits) to look it up.")
            }
        },
        async submit_tweet(){
            if(!this.active || this.busy) return

            if (isRecordId(this.link_or_record)) {
                this.content = message("That is a record ID. Use QUERY A TWEET to look it up, or enter a tweet URL to save a tweet.")
                return
            }

            this.busy = true
            try {
                this.content = message('Fetching the tweet from X...')
                const tweet = await fetchTweet(this.link_or_record)

                this.content = message('Saving the tweet to the local EVM...')
                const transaction = this.contract.methods.saveTweet(
                    tweet.id,
                    tweet.time,
                    tweet.message,
                    tweet.name,
                    tweet.nick,
                    tweet.verified
                )

                // Tevm's estimate can be a little too low for storage writes, so leave room.
                const estimate = await transaction.estimateGas({from: this.account})
                const gas = Math.ceil(Number(estimate) * 1.5)
                const response = await transaction.send({from: this.account, gas})

                const recordId = response.events.NewTweetRecord.returnValues['0']
                const txHash = response.transactionHash

                // Put the record id in the input, so QUERY A TWEET reads the record back.
                this.link_or_record = recordId

                this.content = `
                <p>Transaction is successful. You can query tweet with recordID <span style="color:red">${escapeHtml(recordId)}</span>.</p>
                <p>The record id is in the input field now: press QUERY A TWEET to read it back.</p>
                <p>Saved: ${escapeHtml(tweet.name)} (@${escapeHtml(tweet.nick)}): ${escapeHtml(tweet.message)}</p>
                <p>Verified badge: saved as false (X does not tell). ${escapeHtml(tweet.timeNote)}</p>
                <p>Local transaction hash: ${escapeHtml(txHash)}</p>
                `
            } catch (error) {
                if (!(error instanceof TweetError)) console.error(error)
                this.content = message(error instanceof TweetError ? error.message : "Could not save the tweet: " + (error && error.message || error))
            } finally {
                this.busy = false
            }
        },
        clear(){
            this.link_or_record = "";
            this.content = WELCOME;
        },
        async getTweet() {
            if(!this.active || this.busy) return

            const recordId = this.link_or_record.trim()
            if (parseTweetUrl(recordId)) {
                this.content = message("That is a tweet URL. Use SUBMIT A TWEET to save it. QUERY A TWEET needs the record ID you get after saving.")
                return
            }
            if (!isRecordId(recordId)) {
                this.content = message("A record ID is 0x followed by 64 hex digits. Save a tweet first to get one.")
                return
            }

            this.busy = true
            try {
                const resp = await this.contract.methods.getTweet(recordId).call()
                const recordedAt = resp[0]
                const tweetId = resp[1][0]
                const tweetetAt = resp[1][1]
                const text = resp[1][2]
                const authorName = resp[1][3][0]
                const authorNick = resp[1][3][1]
                const verified = resp[1][3][2]
                const recorderAddress = resp[2]

                if (String(recordedAt) === "0") {
                    this.content = message("No record with this ID. (Records live in this browser only.)")
                    return
                }

                this.content = `
                <table class="table">
                    <tr>
                        <td>Recorded At</td>
                        <td>${escapeHtml(formatSeconds(recordedAt))}</td>
                    </tr>
                    <tr>
                        <td>Recorded By</td>
                        <td>${escapeHtml(recorderAddress)}</td>
                    </tr>
                    <tr>
                        <td>Author (Name)</td>
                        <td>${escapeHtml(authorName)}</td>
                    </tr>
                    <tr>
                        <td>Author (Username)</td>
                        <td>@${escapeHtml(authorNick)}</td>
                    </tr>
                    <tr>
                        <td>Blue Tick</td>
                        <td>${verified ? "yes" : "no or unknown"}</td>
                    </tr>
                    <tr>
                        <td>Tweet</td>
                        <td style="white-space: pre-wrap">${escapeHtml(text)}</td>
                    </tr>
                    <tr>
                        <td>Tweeted At</td>
                        <td>${escapeHtml(formatMillis(tweetetAt))}</td>
                    </tr>
                    <tr>
                        <td>Tweet Id</td>
                        <td>${escapeHtml(tweetId)}</td>
                    </tr>
                </table>
                `
            } catch (error) {
                console.error(error)
                this.content = message("Could not query the record: " + (error && error.message || error))
            } finally {
                this.busy = false
            }
        }
    }
}
);
