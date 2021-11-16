new Vue({
    el : "#app",
    data : {
        link_or_record : "",
        record_id : "abcde",
        time: "28-01-2021",
        tweet: "What a nice day!",
        author: "@gurisozen",
        content : "Welcome! Please enter a Tweet URL or Record ID to start using TWEET VERIFIER.",
        status : false
    },
    methods : {
        submit_tweet(){
            if(this.link_or_record.length == 0){
                this.content = "PLEASE ENTER A VALID URL!";
            }
            else if(this.link_or_record.startsWith("https://twitter.com") == false && this.link_or_record.startsWith("twitter.com") == false && this.link_or_record.startsWith("twitter.com") == false){
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
        }
    }

}
);