const contractData = {
    "abi": [
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "name": "NewTweetRecord",
            "type": "event"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "internalType": "bytes32",
                    "name": "recordId",
                    "type": "bytes32"
                }
            ],
            "name": "getTweet",
            "outputs": [
                {
                    "components": [
                        {
                            "internalType": "uint256",
                            "name": "timestamp",
                            "type": "uint256"
                        },
                        {
                            "components": [
                                {
                                    "internalType": "string",
                                    "name": "id",
                                    "type": "string"
                                },
                                {
                                    "internalType": "uint256",
                                    "name": "time",
                                    "type": "uint256"
                                },
                                {
                                    "internalType": "string",
                                    "name": "message",
                                    "type": "string"
                                },
                                {
                                    "components": [
                                        {
                                            "internalType": "string",
                                            "name": "name",
                                            "type": "string"
                                        },
                                        {
                                            "internalType": "string",
                                            "name": "nick",
                                            "type": "string"
                                        },
                                        {
                                            "internalType": "bool",
                                            "name": "verified",
                                            "type": "bool"
                                        }
                                    ],
                                    "internalType": "struct TweetVerifier.Author",
                                    "name": "author",
                                    "type": "tuple"
                                }
                            ],
                            "internalType": "struct TweetVerifier.Tweet",
                            "name": "tweet",
                            "type": "tuple"
                        },
                        {
                            "internalType": "address",
                            "name": "sender",
                            "type": "address"
                        }
                    ],
                    "internalType": "struct TweetVerifier.TweetRecord",
                    "name": "",
                    "type": "tuple"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {
                    "internalType": "string",
                    "name": "id",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "time",
                    "type": "uint256"
                },
                {
                    "internalType": "string",
                    "name": "message",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "authorName",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "authorNick",
                    "type": "string"
                },
                {
                    "internalType": "bool",
                    "name": "authorVerified",
                    "type": "bool"
                }
            ],
            "name": "saveTweet",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ],
    "address": "0x2Df14C63a92a93efc147F16954e875c7250EABeB"
}

const getWeb3 = () => {
    return new Promise((resolve, reject) => {
      window.addEventListener("load", async () => {
        if (window.ethereum) {
          const web3 = new Web3(window.ethereum);
          try {
            // ask user permission to access his accounts
            await window.ethereum.request({ method: "eth_requestAccounts" });
            resolve(web3);
          } catch (error) {
            reject(error);
          }
        } else {
          reject("Must install MetaMask");
        }
      });
    });
  };


new Vue({
    el : "#app",
    data : {
        link_or_record : "",
        record_id : "abcde",
        time: "28-01-2021",
        tweet: "What a nice day!",
        author: "@gurisozen",
        content : "Welcome! Please enter a Tweet URL or Record ID to start using TWEET VERIFIER.",
        active : false,
        account: '',
        contract: undefined
    },
    methods : {
        async submit_tweet(){
            const resp = await fetch('./tweet.json', { method: 'GET'})
            this.content = await resp.json()
            console.log(resp)
            // if(this.link_or_record.length == 0){
            //     this.content = "PLEASE ENTER A VALID URL!";
            // }
            // else if(this.link_or_record.startsWith("https://twitter.com") == false && this.link_or_record.startsWith("twitter.com") == false && this.link_or_record.startsWith("www.twitter.com") == false){
            //     this.content = "THIS URL DOES NOT BELONG TO A TWEET. PLEASE ENTER A VALID URL!";
            //     ;
            // }
            // else{
            //     this.content = "Your tweet record with information:<br>Record Id: " + this.record_id + "<br>Time: " + this.time + "<br>Author: " + this.author + "<br>Tweet: " + this.tweet + "<br>Has been successfully recorded.<br><br><br>You can easily query your record by Record Id.";
            // }
        },
        clear(){
            this.link_or_record = "";
            this.content = "Welcome! Please enter a Tweet URL or Record ID to start using TWEET VERIFIER.";
        },
        async getTweet() {

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
                    <td>${recordedAt}</td>
                </tr>
                <tr>
                    <td>Recorded By</td>
                    <td>${recorderAddress}</td>
                </tr>
                <tr>
                    <td>Author (Name)</td>
                    <td>${authorName}</td>
                </tr>
                <tr>
                    <td>Author (Username)</td>
                    <td>${authorNick}</td>
                </tr>
                <tr>
                    <td>Blue Tick</td>
                    <td>${verified}</td>
                </tr>
                <tr>
                    <td>Tweet</td>
                    <td>${message}</td>
                </tr>
                <tr>
                    <td>Tweeted At</td>
                    <td>${tweetetAt}</td>
                </tr>
                <tr>
                    <td>Tweet Id</td>
                    <td>${tweetId}</td>
                </tr>
            </table>
            `
        },
        async connect_web3() {
            if (window.ethereum) {
                const resp = await window.ethereum.request({method: 'eth_requestAccounts'})
                this.account = resp[0]

                const bal = parseInt(await window.ethereum.request({
                    method: 'eth_getBalance',
                    params: [this.account, 'latest']
                }))/(10**18)

                this.content = `<p> Account address: ${this.account}</p><p>Account balance: ${bal}</p>`
                this.active = true

                window.web3 = new Web3(window.ethereum)

                this.contract = new window.web3.eth.Contract(contractData.abi, contractData.address)
            } 
            else {
                this.active = false
                this.web3 = undefined
            }
        }
    }

}
);