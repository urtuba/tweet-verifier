pragma solidity >=0.4.0 <0.6.0;

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
    
    address [] authorized;
    mapping (bytes32 => TweetRecord) records;
    
}