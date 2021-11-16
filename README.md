# Tweet Verifier
**Tweet verifier** aims to prevent the spread of false information. Users may submit a tweet by using their ethereum wallets to create immutable records of it. 

## Smart Contract

For deployment, go to [Ethereum Remix](https://remix.ethereum.org). Upload the *tweet-verifier.sol*. Use a compatible solidity version(^0.4.0 - 0.6.0) to compile. (*You may get some warnings about some solidity features that are still beta.*)

Go to deployment section. For demo purpose, **Javascript VM** can be used. Or **injected Web3** for on-chain tests. Vertical navigation in *Deploy, Run & Transactions* section show the contract and allows you to transact to contract. There are two functions: one for submitting new tweet record and a function to query tweet record by id.

## Webpage

For live preview of current application: [Heroku: tweet-verifier](https://tweet-verifier.herokuapp.com)

The deliverables for week 2 is completed (Contract API and Front-end Design).

The deliverables for week 3 is completed (Functionalities of Front-end and improvement of Front-end visual design).

## Front-end Functionalities:
#### Buttons:
##### Submit A Tweet Button:
+ Change initial content in following cases:
  <br />1- When input is empty.
  <br />2- When the input is not a valid tweet URL.
  <br />3- When the input is a valid tweet URL (e.g. https://twitter.com/itu1773?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eserp%7Ctwgr%5Eauthor)
##### Query A Tweet Button:
+ Change initial content in following cases:
  <br />1- When input is empty.
  <br />2- When the input is not a valid Record Id (Can be tested by entering a string that is not with the lenght 5).
  <br />3- When the input is a valid Record Id (Can be tested by entering a string that is with the lenght 5).
##### Web3 Connection Status Button:
+ Change status indicator color when clicked (The Web3 connection is not obtained at this level)
##### Clear Button:
+ Change the current content to initial content.

