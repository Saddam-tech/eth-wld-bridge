const { ethers } = require("hardhat");
require("dotenv").config();
const {
  abi: ethereum_bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const {
  abi: wld_bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");

// const encryptedJson = fs.readFileSync("./.encryptedKey.json", "utf8");
// const encryptedPk = new ethers.Wallet.fromEncryptedJsonSync(
//   encryptedJson,
//   process.env.PRIVATE_KEY_PW
// );

const gasLimit = 100000;
const txProcessInterval = 15000;
const CHAIN1_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;
const CHAIN2_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
const CHAIN1_PROVIDER = new ethers.providers.JsonRpcProvider(
  process.env.local_provider_chain_1
);
const CHAIN2_PROVIDER = new ethers.providers.JsonRpcProvider(
  process.env.local_provider_chain_2
);
// Create Contract instances for the lock contracts on both chains
const CHAIN1_CONTRACT = new ethers.Contract(
  CHAIN1_BRIDGE_CONTRACT_ADDRESS,
  ethereum_bridge_abi,
  CHAIN1_PROVIDER,
  { gasLimit }
);
const CHAIN2_CONTRACT = new ethers.Contract(
  CHAIN2_BRIDGE_CONTRACT_ADDRESS,
  wld_bridge_abi,
  CHAIN2_PROVIDER,
  { gasLimit }
);
// Get a wallet using the admin private key
const WALLET_CHAIN1 = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  CHAIN1_PROVIDER
);
const WALLET_CHAIN2 = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  CHAIN2_PROVIDER
);

module.exports = {
  gasLimit,
  txProcessInterval,
  CHAIN1_CONTRACT,
  CHAIN2_CONTRACT,
  WALLET_CHAIN1,
  WALLET_CHAIN2,
};
