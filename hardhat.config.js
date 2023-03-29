require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("./tasks/get-accounts");
/** @type import('hardhat/config').HardhatUserConfig */
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2;
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 5,
    },
    mumbai: {
      url: MUMBAI_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 80001,
    },
    localhost_1: {
      url: "http://127.0.0.1:8545/",
      accounts: [PRIVATE_KEY],
      chainId: 31337,
      gas: 100000,
    },
    localhost_2: {
      url: "http://127.0.0.1:7545",
      accounts: [PRIVATE_KEY_2],
      chainId: 1337,
      gas: 100000,
    },
  },
  solidity: "0.8.0",
};
