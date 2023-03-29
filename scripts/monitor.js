const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: ethereum_bridge_abi,
} = require("../artifacts/contracts/EthereumBridge.sol/EthereumBridge.json");
const {
  abi: polygon_bridge_abi,
} = require("../artifacts/contracts/PolygonBridge.sol/PolygonBridge.json");

// Specify the lock contract addresses and ABIs for both chains
const chain_1_bridge_contract_address =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;

const chain_2_bridge_contract_address =
  process.env.POLYGON_BRIDGE_CONTRACT_ADDRESS;

// Specify the admin private key
const privateKey_1 = process.env.PRIVATE_KEY;
const privateKey_2 = process.env.PRIVATE_KEY_2;

const TANGA_TOKEN_ADDRESS_POLYGON = process.env.TANGA_TOKEN_ADDRESS_POLYGON;
const TANGA_TOKEN_ADDRESS_ETHEREUM = process.env.TANGA_TOKEN_ADDRESS_ETHEREUM;

async function monitorLockEvents() {
  // Connect to both chains using the JsonRpcProvider class
  const chain1Provider = new ethers.providers.JsonRpcProvider(
    process.env.provider_chain_1
  );
  const chain2Provider = new ethers.providers.JsonRpcProvider(
    process.env.provider_chain_2
  );

  // Create Contract instances for the lock contracts on both chains
  const chain_1_contract = new ethers.Contract(
    chain_1_bridge_contract_address,
    ethereum_bridge_abi,
    chain1Provider,
    { gasLimit: 100000 }
  );

  const chain_2_contract = new ethers.Contract(
    chain_2_bridge_contract_address,
    polygon_bridge_abi,
    chain2Provider,
    { gasLimit: 100000 }
  );
  // Get a wallet using the admin private key
  const wallet_chain_1 = new ethers.Wallet(privateKey_1, chain1Provider);
  const wallet_chain_2 = new ethers.Wallet(privateKey_2, chain2Provider);
  console.log("Started monitoring chain 1 for Lock transactions...");
  // Listen for the Lock event on the chain_1_contract
  chain_1_contract.on(
    "Transfer",
    async (from, to, amount, token, tokenType, nonce) => {
      console.log(`<<<<<<<<<< Lock event detected on CHAIN_1 >>>>>>>>>>>`);
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("token: ", token);
      console.log("token_name: ", tokenType);
      console.log("nonce: ", nonce);

      // Check if the same transaction is being executed the second time

      if (await chain_2_contract.processedNonces(nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
        return;
      }

      // Mint the same amount of tokens on chain 2 using the admin private key
      const tx = await chain_2_contract
        .connect(wallet_chain_2)
        .mint(to, amount, TANGA_TOKEN_ADDRESS_POLYGON, tokenType, nonce);
      await tx.wait();
      console.log(
        `Minted equivalent amount of ${tokenType} to ${to} on CHAIN2`
      );
      console.log(`Txhash: ${tx.hash}`);
    }
  );

  // Listen for the Lock event on the chain_2_contract
  chain_2_contract.on(
    "Transfer",
    async (from, to, amount, token, tokenType, nonce) => {
      console.log(`<<<<<<<<<< Lock event detected on CHAIN_2 >>>>>>>>>>>`);
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("token: ", token);
      console.log("token_name: ", tokenType);
      console.log("nonce: ", nonce);

      // Check if the same transaction is being executed the second time

      if (await chain_1_contract.processedNonces(nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
        return;
      }

      // Unlock the same amount of tokens on chain 1 using the admin private key
      const tx = await chain_1_contract
        .connect(wallet_chain_1)
        .unlockTokens(to, amount, TANGA_TOKEN_ADDRESS_ETHEREUM, nonce);
      await tx.wait();
      console.log(
        `Unlocked equivalent amount of ${tokenType} to ${to} on CHAIN1`
      );
      console.log(`Txhash: ${tx.hash}`);
    }
  );
}

monitorLockEvents().catch((err) => {
  console.log(err);
  process.exit(1);
});
