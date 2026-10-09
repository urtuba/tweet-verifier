import { expect } from "chai";
import hre from "hardhat";
import * as contractData from "../contract-data.js";

// The web page deploys the contract from contract-data.js. This test keeps that
// file in step with the Hardhat build of contract/tweet-verifier.sol.
describe("contract-data.js", () => {
  let artifact;

  before(async () => {
    artifact = await hre.artifacts.readArtifact("TweetVerifier");
  });

  const hint = "contract-data.js is out of date. Run: npm run export-contract";

  it("has the ABI of the Hardhat build", () => {
    expect(contractData.abi, hint).to.deep.equal(artifact.abi);
  });

  it("has the creation bytecode of the Hardhat build", () => {
    expect(contractData.bytecode, hint).to.equal(artifact.bytecode);
  });

  it("has the deployed bytecode of the Hardhat build", () => {
    expect(contractData.deployedBytecode, hint).to.equal(artifact.deployedBytecode);
  });
});
