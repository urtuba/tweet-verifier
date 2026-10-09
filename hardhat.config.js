import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";

// The contract keeps its 2021 Solidity (>=0.4.0 <0.6.0); 0.5.17 is the last compatible release.
export default {
  plugins: [hardhatEthers, hardhatMocha],
  solidity: {
    version: "0.5.17",
  },
  paths: {
    sources: "./contract",
    tests: { mocha: "./test" },
  },
};
