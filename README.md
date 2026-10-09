# Tweet Verifier

ITU Project I team project by Samed Kahyaoglu and Guris Özen, 2021. Restored in 2026: live demo on an in-browser EVM, real tweet data, tests, CI. Original code: tag [`original-2021`](https://github.com/urtuba/tweet-verifier/tree/original-2021).

## Live demo

https://urtuba.github.io/tweet-verifier/

No wallet and no test ETH needed. Open the page, paste a public tweet URL (`x.com` or `twitter.com`), press **Submit a tweet**, then **Query a tweet** to read the record back.

## What it does

Tweet Verifier saves a tweet as a record in a Solidity smart contract. The record holds the tweet id, its time, its text, the author name and handle, the time of saving and the sender. The record id is the hash of the tweet id, time, text and author handle, so anyone who knows the tweet can compute it and look it up. The idea (2021): a tweet can be deleted or edited, a record on a blockchain cannot.

The page is a small Vue 2 + web3.js front end:

- **Submit a tweet**: fetches the tweet from X, saves it with `saveTweet`, and shows the record id.
- **Query a tweet**: reads a record with `getTweet`.
- **Local EVM** (status box): shows when the contract is ready.

## How the demo works

In 2021 the page used MetaMask, a contract on the Ropsten testnet and a Heroku server. All three are gone (Ropsten was shut down in 2022). The demo now needs none of them:

- The page runs an EVM inside your browser ([Tevm](https://tevm.sh)) and deploys the contract when it loads. web3.js talks to it through Tevm's EIP-1193 provider, the same way it talked to MetaMask.
- Tweet data is real. The page asks X's public [oEmbed](https://developer.x.com/en/docs/x-for-websites/oembed-api) endpoint (no API key) for the tweet. The author comes from `author_name` and `author_url`, the text from the HTML (parsed, never inserted into the page), the time from the tweet id.
- The chain state is saved in your browser's `localStorage`, so records survive a reload in the same browser.

**The trade-off:** this demo runs the same contract on a local EVM in your browser. On a real network the record would be public and permanent; here it lives only in your browser.

## Try the contract in Remix

[Open the contract in Remix](https://remix.ethereum.org/#url=https://raw.githubusercontent.com/urtuba/tweet-verifier/main/contract/tweet-verifier.sol&version=soljson-v0.5.17+commit.d19bba13.js) (compiler 0.5.17). Compile it, deploy it with the **Remix VM**, then call `saveTweet` and `getTweet`. You will see some warnings about the experimental `ABIEncoderV2`.

## Run it yourself

You need Node 22.

```
npm ci
npm test
```

The tests cover the contract (Hardhat 3, solc 0.5.17, mocha, chai, ethers), the helper code that turns a tweet URL into record data, and check that `contract-data.js` (the ABI and bytecode the page deploys) matches the Hardhat build. CI runs the same on every push and pull request.

After you change the contract, run `npm run export-contract` to update `contract-data.js`; the tests fail if you forget.

To open the page locally, serve the folder over HTTP (ES modules do not load from `file://`), for example `python3 -m http.server`, then open http://localhost:8000.

## Known limitations

About the demo:

- **It depends on X's oEmbed.** It only returns public tweets, only the text (no media) and no more than X allows. X can change it, rate-limit it or switch it off, and then saving fails. The endpoint answers with a redirect to `publish.x.com`.
- **No verified badge.** oEmbed does not say if an account is verified, so `verified` is always saved as `false`.
- **Records are local.** They exist only in this browser's `localStorage`. Clearing site data deletes them, other people and other browsers cannot see them, and the sender is a built-in test account. Only the EVM state is saved: block and transaction history is not, so transaction hashes are only shown right after saving. Tevm's state persistence is marked experimental by its authors.
- **Old tweets have a date only.** Tweets from before November 2010 have no time in their id; the page saves the date from oEmbed (00:00 UTC), or 0 if there is none.
- **It loads pre-release libraries from a CDN.** Tevm is a release candidate; the page pins its packages to exact versions and loads about 160 small modules from jsDelivr, so the first visit takes a few seconds. The Tevm npm package `tevm` itself does not install cleanly at the time of writing, so the page imports its parts directly.

About the contract (kept as it was in 2021, apart from restoring the `NewTweetRecord` event):

- **It does not check that the tweet is real.** `saveTweet` stores whatever the caller sends. A record shows what a sender claimed, not what X published.
- **Saving the same tweet again overwrites the record.** The timestamp and the sender change, so the first record's evidence is lost, and anyone can do this.
- **The record id can collide.** It uses `abi.encodePacked` with several strings, so for example a text `ab` with handle `c` and a text `a` with handle `bc` give the same id. The author name and the verified flag are not part of the id, so changing them also overwrites the record.
- **Old Solidity.** It targets `>=0.4.0 <0.6.0` (compiled with 0.5.17) and uses the experimental `ABIEncoderV2`. The timestamp comes from `now`, which block producers can shift a little.
- No access control, no way to delete or update a record on purpose.

## Course material

[`guidelines/proposal.pdf`](guidelines/proposal.pdf) and [`guidelines/data-model.png`](guidelines/data-model.png) come from the original course project.

## License

MIT, Copyright (c) 2021 Samed Kahyaoglu, Guris Ozen. See [LICENSE](LICENSE).
