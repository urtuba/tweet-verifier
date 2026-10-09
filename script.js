import { TweetError, fetchTweet } from "./tweet.js";

const WELCOME = "Welcome! Please enter a Tweet URL or Record ID to start using TWEET VERIFIER.";

// Values shown with v-html must be escaped first.
const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

new Vue({
    el : "#app",
    data : {
        link_or_record : "",
        content : WELCOME,
        // Status of the local EVM: "starting", "ready" or "error"
        evm_state : "starting",
        evm_note : "starting...",
        active : false,
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
                this.evm_note = evm.persisted ? "ready (saved in this browser)" : "ready (lost on reload)"
            } catch (error) {
                console.error(error)
                this.evm_state = "error"
                this.evm_note = "failed to start"
                this.content = `<p>The local EVM could not start: ${escapeHtml(error && error.message || error)}</p>`
            }
        },
        async submit_tweet(){
            if(!this.active) {
                this.content = "The local EVM is not ready yet."
                return
            }

            try {
                this.content = 'Fetching the tweet from X...'
                const tweet = await fetchTweet(this.link_or_record)

                this.content = 'Saving the tweet to the local EVM...'
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

                this.content = `
                <p>Transaction is successful. You can query tweet with recordID <span style="color:red">${escapeHtml(recordId)}</span>.</p>
                <p>Saved: ${escapeHtml(tweet.name)} (@${escapeHtml(tweet.nick)}): ${escapeHtml(tweet.message)}</p>
                <p>Verified badge: saved as false (X does not tell). ${escapeHtml(tweet.timeNote)}</p>
                <p>Local transaction hash: ${escapeHtml(txHash)}</p>
                `
            } catch (error) {
                if (!(error instanceof TweetError)) console.error(error)
                const reason = error instanceof TweetError ? error.message : "Could not save the tweet: " + (error && error.message || error)
                this.content = `<p>${escapeHtml(reason)}</p>`
            }
        },
        clear(){
            this.link_or_record = "";
            this.content = WELCOME;
        },
        async getTweet() {
            if(!this.active) {
                this.content = "The local EVM is not ready yet."
                return
            }

            try {
                const resp = await this.contract.methods.getTweet(this.link_or_record).call()
                const recordedAt = resp[0]
                const tweetId = resp[1][0]
                const tweetetAt = resp[1][1]
                const message = resp[1][2]
                const authorName = resp[1][3][0]
                const authorNick = resp[1][3][1]
                const verified = resp[1][3][2]
                const recorderAddress = resp[2]

                this.content = `
                <table class="table">
                    <tr>
                        <td>Recorded At</td>
                        <td>${escapeHtml(recordedAt)}</td>
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
                        <td>${escapeHtml(authorNick)}</td>
                    </tr>
                    <tr>
                        <td>Blue Tick</td>
                        <td>${escapeHtml(verified)}</td>
                    </tr>
                    <tr>
                        <td>Tweet</td>
                        <td>${escapeHtml(message)}</td>
                    </tr>
                    <tr>
                        <td>Tweeted At</td>
                        <td>${escapeHtml(tweetetAt)}</td>
                    </tr>
                    <tr>
                        <td>Tweet Id</td>
                        <td>${escapeHtml(tweetId)}</td>
                    </tr>
                </table>
                `
            } catch (error) {
                console.error(error)
                this.content = `<p>Could not query the record: ${escapeHtml(error && error.message || error)}</p>`
            }
        }
    }
}
);
