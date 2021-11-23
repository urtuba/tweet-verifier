const contract = {
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
        web3: undefined
    },
    methods : {
        submit_tweet(){
            if(this.link_or_record.length == 0){
                this.content = "PLEASE ENTER A VALID URL!";
            }
            else if(this.link_or_record.startsWith("https://twitter.com") == false && this.link_or_record.startsWith("twitter.com") == false && this.link_or_record.startsWith("www.twitter.com") == false){
                this.content = "THIS URL DOES NOT BELONG TO A TWEET. PLEASE ENTER A VALID URL!";
                ;
            }
            else{
                this.content = "Your tweet record with information:<br>Record Id: " + this.record_id + "<br>Time: " + this.time + "<br>Author: " + this.author + "<br>Tweet: " + this.tweet + "<br>Has been successfully recorded.<br><br><br>You can easily query your record by Record Id.";
            }
        },
        clear(){
            this.link_or_record = "";
            this.content = "Welcome! Please enter a Tweet URL or Record ID to start using TWEET VERIFIER.";
        },
        query_tweet(){
            if(this.link_or_record.length != 5){
                this.content = "PLEASE ENTER A VALID RECORD ID!";
            }
            else{
                this.content = "Your tweet record with Record Id <b>" + this.record_id + "</b>:<br>Time: " + this.time + "<br>Author: " + this.author + "<br>Tweet: " + this.tweet;
            }
        },
        async connect_web3() {
            // if (this.active = true) {
            //     this.active = false
            //     return
            // }
            console.log(window.web3)

            if (window.ethereum) {
                const resp = await window.ethereum.request({method: 'eth_requestAccounts'})
                // await ethereum.enable()
                this.content = `Account connected ${resp[0]}`
                this.active = true
            } 
            else {
                this.active = false
                this.web3 = undefined
            }
        }
    }

}
);