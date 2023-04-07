require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("./tasks/get-accounts");
/** @type import('hardhat/config').HardhatUserConfig */
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    worldland: {
      url: "https://rpc.lvscan.io",
      accounts: [
        "36ce51e7722a9dadedf6dedc8210f4949db2f7aa031d2d10190e8ea5312189d9",
      ],
      chainId: 12345,
      gas: 100000,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
      gas: 100000,
    },
    mumbai: {
      url: MUMBAI_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 80001,
      gas: 100000,
    },
    localhost_1: {
      url: process.env.provider_chain_1,
      accounts: [PRIVATE_KEY],
      chainId: 31337,
      gas: 100000,
    },
    localhost_2: {
      url: process.env.provider_chain_2,
      accounts: [PRIVATE_KEY],
      chainId: 31337,
      gas: 100000,
    },
  },
  solidity: "0.8.0",
};
