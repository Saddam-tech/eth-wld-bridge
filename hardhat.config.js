require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("./tasks/get-accounts");
/** @type import('hardhat/config').HardhatUserConfig */

// const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
// const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL;
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    // current supported networks
    // sepolia: {
    //   url: process.env.provider_chain_1,
    //   accounts: [encryptedPk],
    //   chainId: 11155111,
    //   gas: 100000,
    // },
    // worldland: {
    //   url: process.env.provider_chain_2,
    //   accounts: [encryptedPk],
    //   chainId: 12345,
    //   gas: 100000,
    // },
    // // current supported networks
    // mumbai: {
    //   url: MUMBAI_RPC_URL,
    //   accounts: [encryptedPk],
    //   chainId: 80001,
    //   gas: 100000,
    // },
    // localhost_1: {
    //   url: process.env.provider_chain_1,
    //   accounts: [encryptedPk],
    //   chainId: 31337,
    //   gas: 100000,
    // },
    // localhost_2: {
    //   url: process.env.provider_chain_2,
    //   accounts: [encryptedPk],
    //   chainId: 31337,
    //   gas: 100000,
    // },
  },
  solidity: "0.8.0",
};
