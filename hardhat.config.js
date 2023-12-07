require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("./tasks/get-accounts");
/** @type import('hardhat/config').HardhatUserConfig */
const gas = 100000;
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
      gas,
    },
    worldland: {
      url: process.env.provider_chain_2,
      // accounts: [encryptedPk],
      accounts: [PRIVATE_KEY],
      chainId: 103,
      gas,
    },
    localhost_1: {
      url: process.env.local_provider_chain_1,
      // accounts: [encryptedPk],
      chainId: 31337,
      gas,
    },
    localhost_2: {
      url: process.env.local_provider_chain_2,
      // accounts: [encryptedPk],
      chainId: 31337,
      gas,
    },
  },
  solidity: "0.8.0",
};
