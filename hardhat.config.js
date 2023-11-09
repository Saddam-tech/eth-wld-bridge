require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("./tasks/get-accounts");
/** @type import('hardhat/config').HardhatUserConfig */

// const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    // current supported networks
    sepolia: {
      url: process.env.provider_chain_1,
      // accounts: [encryptedPk],
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
      gas: 100000,
    },
    worldland: {
      url: process.env.provider_chain_2,
      // accounts: [encryptedPk],
      accounts: [PRIVATE_KEY],
      chainId: 103,
      gas: 100000,
    },
    localhost_1: {
      url: process.env.local_provider_chain_1,
      // accounts: [encryptedPk],
      accounts: [PRIVATE_KEY],
      chainId: 31337,
      gas: 100000,
    },
    localhost_2: {
      url: process.env.local_provider_chain_2,
      // accounts: [encryptedPk],
      accounts: [PRIVATE_KEY],
      chainId: 31337,
      gas: 100000,
    },
  },
  solidity: "0.8.0",
};
