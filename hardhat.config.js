require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("./tasks/get-accounts");
const path = require("path");
const resolvePath = path.resolve(__dirname, "./.encryptedKey.json");
const fs = require("fs-extra");
const ethers = require("ethers");
// const { getParameterFromAWS } = require("./configs/vaultAccess");
/** @type import('hardhat/config').HardhatUserConfig */
const gas = 300000000000;
const encryptedJson = fs.readFileSync(resolvePath, "utf8");
const wallet = ethers.Wallet.fromEncryptedJsonSync(
  encryptedJson,
  process.env.PRIVATE_KEY_PW
);
const PRIVATE_KEY = wallet.privateKey;
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    // current supported networks
    sepolia: {
      url: process.env.provider_chain_1,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
      gas,
    },
    worldland: {
      url: process.env.provider_chain_2,
      accounts: [PRIVATE_KEY],
      chainId: 103,
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
