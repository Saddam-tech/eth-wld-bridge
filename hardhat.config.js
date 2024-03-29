require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("./tasks/get-accounts");
const fs = require("fs-extra");
const ethers = require("ethers");
const { getParameterFromAWS } = require("./configs/vaultAccess");
/** @type import('hardhat/config').HardhatUserConfig */
const gas = 300000000000;

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    // current supported networks
    sepolia: {
      url: process.env.provider_chain_1,
      chainId: 11155111,
      gas,
    },
    worldland: {
      url: process.env.provider_chain_2,
      chainId: 10395,
      gas,
    },
    localhost_1: {
      url: process.env.provider_chain_1,
      chainId: 31337,
      gas,
    },
    localhost_2: {
      url: process.env.provider_chain_2,
      chainId: 31337,
      gas,
    },
  },
  solidity: "0.8.0",
};
