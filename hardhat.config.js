require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("./tasks/get-accounts");
const ethers = require("ethers");
/** @type import('hardhat/config').HardhatUserConfig */
const gas = 100000;
const encryptedJson = fs.readFileSync("./.encryptedKey.json", "utf8");
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
