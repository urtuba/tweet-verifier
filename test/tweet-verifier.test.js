import { expect } from "chai";
import hre from "hardhat";
import { id as keccakText, solidityPackedKeccak256, ZeroAddress, ZeroHash } from "ethers";

const TWEET = {
  id: "20",
  time: 1142974214000n,
  message: "just setting up my twttr",
  authorName: "jack",
  authorNick: "jack",
  authorVerified: false,
};

const args = (t) => [t.id, t.time, t.message, t.authorName, t.authorNick, t.authorVerified];

// The contract derives the record id from the tweet id, time, message and author nick.
const expectedRecordId = (t) =>
  solidityPackedKeccak256(
    ["string", "uint256", "string", "string"],
    [t.id, t.time, t.message, t.authorNick],
  );

describe("TweetVerifier", () => {
  let ethers, contract, alice, bob;

  const blockTimestamp = async (receipt) =>
    BigInt((await ethers.provider.getBlock(receipt.blockNumber)).timestamp);

  beforeEach(async () => {
    ({ ethers } = await hre.network.create());
    [alice, bob] = await ethers.getSigners();
    contract = await ethers.deployContract("TweetVerifier");
  });

  describe("saveTweet", () => {
    it("returns the record id: keccak256(abi.encodePacked(id, time, message, authorNick))", async () => {
      const recordId = await contract.saveTweet.staticCall(...args(TWEET));
      expect(recordId).to.equal(expectedRecordId(TWEET));
    });

    it("stores the tweet under that record id", async () => {
      await (await contract.saveTweet(...args(TWEET))).wait();

      const record = await contract.getTweet(expectedRecordId(TWEET));
      expect(record.tweet.id).to.equal(TWEET.id);
      expect(record.tweet.time).to.equal(TWEET.time);
      expect(record.tweet.message).to.equal(TWEET.message);
      expect(record.tweet.author.name).to.equal(TWEET.authorName);
      expect(record.tweet.author.nick).to.equal(TWEET.authorNick);
      expect(record.tweet.author.verified).to.equal(false);
    });

    it("stores the verified flag as given", async () => {
      const verified = { ...TWEET, authorVerified: true };
      await (await contract.saveTweet(...args(verified))).wait();

      const record = await contract.getTweet(expectedRecordId(verified));
      expect(record.tweet.author.verified).to.equal(true);
    });

    it("records the sender and the block timestamp", async () => {
      const receipt = await (await contract.connect(bob).saveTweet(...args(TWEET))).wait();

      const record = await contract.getTweet(expectedRecordId(TWEET));
      expect(record.sender).to.equal(bob.address);
      expect(record.timestamp).to.equal(await blockTimestamp(receipt));
    });

    it("gives different tweets different record ids", async () => {
      const other = { ...TWEET, id: "21", message: "another tweet" };
      await (await contract.saveTweet(...args(TWEET))).wait();
      await (await contract.saveTweet(...args(other))).wait();

      expect(expectedRecordId(other)).to.not.equal(expectedRecordId(TWEET));
      expect((await contract.getTweet(expectedRecordId(TWEET))).tweet.message).to.equal(TWEET.message);
      expect((await contract.getTweet(expectedRecordId(other))).tweet.message).to.equal(other.message);
    });

    it("accepts empty strings and zero time", async () => {
      const empty = { id: "", time: 0n, message: "", authorName: "", authorNick: "", authorVerified: false };
      const recordId = await contract.saveTweet.staticCall(...args(empty));
      expect(recordId).to.equal(expectedRecordId(empty));
    });
  });

  describe("getTweet", () => {
    it("returns an empty record for an unknown id", async () => {
      const record = await contract.getTweet(ZeroHash);
      expect(record.timestamp).to.equal(0n);
      expect(record.sender).to.equal(ZeroAddress);
      expect(record.tweet.id).to.equal("");
      expect(record.tweet.time).to.equal(0n);
      expect(record.tweet.message).to.equal("");
      expect(record.tweet.author.name).to.equal("");
      expect(record.tweet.author.nick).to.equal("");
      expect(record.tweet.author.verified).to.equal(false);
    });

    it("returns an empty record before anything is saved under the id", async () => {
      const record = await contract.getTweet(expectedRecordId(TWEET));
      expect(record.timestamp).to.equal(0n);
    });
  });

  describe("NewTweetRecord event", () => {
    it("is declared in the ABI exactly as the front end expects: one unnamed, non-indexed bytes32", async () => {
      const artifact = await hre.artifacts.readArtifact("TweetVerifier");
      const events = artifact.abi.filter((item) => item.type === "event");
      expect(events).to.deep.equal([
        {
          anonymous: false,
          inputs: [{ indexed: false, internalType: "bytes32", name: "", type: "bytes32" }],
          name: "NewTweetRecord",
          type: "event",
        },
      ]);
    });

    it("is emitted once by saveTweet and carries the record id", async () => {
      const receipt = await (await contract.saveTweet(...args(TWEET))).wait();

      expect(receipt.logs).to.have.length(1);
      const log = receipt.logs[0];
      expect(log.address).to.equal(await contract.getAddress());
      expect(log.topics).to.deep.equal([keccakText("NewTweetRecord(bytes32)")]);

      const parsed = contract.interface.parseLog(log);
      expect(parsed.name).to.equal("NewTweetRecord");
      expect(parsed.args[0]).to.equal(expectedRecordId(TWEET));
    });

    it("is emitted again when the same tweet is saved again", async () => {
      await (await contract.saveTweet(...args(TWEET))).wait();
      const receipt = await (await contract.saveTweet(...args(TWEET))).wait();

      expect(receipt.logs).to.have.length(1);
      expect(contract.interface.parseLog(receipt.logs[0]).args[0]).to.equal(expectedRecordId(TWEET));
    });

    it("leaves one log after one save; reading with getTweet adds none", async () => {
      await (await contract.saveTweet(...args(TWEET))).wait();
      const logs = await ethers.provider.getLogs({ address: await contract.getAddress(), fromBlock: 0 });
      expect(logs).to.have.length(1);
    });
  });

  describe("saving the same tweet again (known weak spot)", () => {
    it("overwrites the timestamp and the sender of the record", async () => {
      const first = await (await contract.connect(alice).saveTweet(...args(TWEET))).wait();
      const second = await (await contract.connect(bob).saveTweet(...args(TWEET))).wait();
      const recordId = expectedRecordId(TWEET);

      const firstTime = await blockTimestamp(first);
      const secondTime = await blockTimestamp(second);
      expect(secondTime).to.be.greaterThan(firstTime);

      const record = await contract.getTweet(recordId);
      expect(record.sender).to.equal(bob.address);
      expect(record.timestamp).to.equal(secondTime);
    });

    it("overwrites author name and verified flag, which are not part of the record id", async () => {
      await (await contract.saveTweet(...args(TWEET))).wait();
      const changed = { ...TWEET, authorName: "someone else", authorVerified: true };
      expect(expectedRecordId(changed)).to.equal(expectedRecordId(TWEET));
      await (await contract.saveTweet(...args(changed))).wait();

      const record = await contract.getTweet(expectedRecordId(TWEET));
      expect(record.tweet.author.name).to.equal("someone else");
      expect(record.tweet.author.verified).to.equal(true);
    });

    it("lets two different tweets collide when message and author nick are shifted (abi.encodePacked)", async () => {
      const a = { ...TWEET, message: "ab", authorNick: "c" };
      const b = { ...TWEET, message: "a", authorNick: "bc" };
      expect(expectedRecordId(a)).to.equal(expectedRecordId(b));

      await (await contract.saveTweet(...args(a))).wait();
      await (await contract.saveTweet(...args(b))).wait();

      const record = await contract.getTweet(expectedRecordId(a));
      expect(record.tweet.message).to.equal("a");
      expect(record.tweet.author.nick).to.equal("bc");
    });
  });
});
