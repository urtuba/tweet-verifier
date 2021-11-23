# Tweet Verifier
**Tweet verifier** aims to prevent the spread of false information. Users may submit a tweet by using their ethereum wallets to create immutable records of it. It is planned as 4 week(1 working day) for 2 people, for Istanbul Technical University's Project I course.  

# Smart Contract

For deployment, go to [Ethereum Remix](https://remix.ethereum.org). Upload the *tweet-verifier.sol*. Use a compatible solidity version(^0.4.0 - 0.6.0) to compile. (*You may get some warnings about some solidity features that are still beta.*)

Go to deployment section. For demo purpose, **Javascript VM** can be used. Or **injected Web3** for on-chain tests. Vertical navigation in *Deploy, Run & Transactions* section show the contract and allows you to transact to contract. There are two functions: one for submitting new tweet record and a function to query tweet record by id.

# Webpage

A simple front-end app is implemented for smart contract. `web3js` and `metamask` is used to connect Ethereum network.
For live preview of current application: [Heroku: tweet-verifier](https://tweet-verifier.herokuapp.com)

```
In order to use preview webpage, you need to connect Ethereum ropsten test network. Contract is deployed there and its address & network is hardcoded.
```


## Front-end Functionalities
### Submit A Tweet
Change initial content in following cases:

1. When input is empty.
2. When the input is not a valid tweet URL
3. When the input is a valid tweet URL

```
NOTE: It submits the same tweet from (./tweet.json) each time. Because Twitter rejected API access and blocks web-scraping tweets. If you have API auth in a idle account, you can communicate to share keys.
```

### Query A Tweet 
Change initial content in following cases:
1. When input is empty.
2. When the input is not a valid `recordId` (form doesn't check it)


### Inject Web3
+ Use Google Chrome & Metamask extension
+ Change status indicator color when clicked (The Web3 connection via Metamask is obtained at this level)
  
### Clear
+ Change the current content to initial content.

# Project Deliverables

All completed.

### W1
* ~~Data Model~~
* ~~Guide Materials~~

### W2
* ~~Smart Contract~~
* ~~Front-end Draft~~

### W3
* ~~Contract API~~
* ~~Front-end Functionalities & Design~~

### W4
* ~~Web-App~~
* ~~_Presentation_~~


# Licence
MIT License

Copyright (c) 2021 Samed Kahyaoglu, Guris Ozen

[Full Text](https://github.com/urtuba/tweet-verifier/blob/main/LICENSE)