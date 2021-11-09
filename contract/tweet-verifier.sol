pragma solidity >=0.4.0 <0.6.0;
pragma experimental ABIEncoderV2;

contract TweetVerifier  {
    
    // Type definitions
    
    struct Author {
        string name;
        string nick;
        bool verified;
    }
    
    struct Tweet {
        string id;
        uint time;
        string message;
        Author author;
    }
    
    struct TweetRecord {
        uint timestamp;
        Tweet tweet;
        address sender;
    }
    
    // Storage
    
    mapping (bytes32 => TweetRecord) records;
    
        
    // Functionality
    
    function saveTweet(string memory id, uint time, string memory message, string memory authorName, string memory authorNick, bool authorVerified) 
    public returns (bytes32)
    {
        // create id by using tweet data's hash
        bytes32 recordId = keccak256(abi.encodePacked(id, time, message, authorNick));
        
        // init and save TweetRecord
        Author memory author = Author(authorName, authorNick, authorVerified);
        Tweet memory tweet = Tweet(id, time, message, author);
        records[recordId] = TweetRecord(now, tweet, msg.sender);
        
        // return its id
        return recordId;
    }
    
    
    function getTweet(bytes32 recordId) public view returns (TweetRecord memory) {
        return records[recordId];
    }
    
}