require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("./tasks/get-accounts");
/** @type import('hardhat/config').HardhatUserConfig */
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
module.exports = {
  // defaultNetwork: "hardhat",
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
      accounts: [
        "0x68ee40c579c2ae1a0d54889853da398e2811995840125c9d211e4d2f5651c6cd",
      ],
      chainId: 1337,
      gas: 100000,
    },
  },
  solidity: "0.8.0",
};
