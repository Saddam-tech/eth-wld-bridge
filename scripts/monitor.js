const { ethers } = require("hardhat");
const fs = require("fs-extra");
require("dotenv").config();

const {
  abi: ethereum_bridge_abi,
} = require("../artifacts/contracts/EthereumBridge.sol/EthereumBridge.json");
const {
  abi: polygon_bridge_abi,
} = require("../artifacts/contracts/PolygonBridge.sol/PolygonBridge.json");

const {
  abi: erc20_abi,
} = require("../artifacts/contracts/TokenBase.sol/TokenBase.json");
const { map_chain_2_tokenAddr_to_chain_1_tokenAddr } = require("./util");

// Specify the lock contract addresses and ABIs for both chains
const chain_1_bridge_contract_address =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;

const chain_2_bridge_contract_address =
  process.env.POLYGON_BRIDGE_CONTRACT_ADDRESS;

const encryptedJson = fs.readFileSync("./.encryptedKey.json", "utf8");
const encryptedPk = new ethers.Wallet.fromEncryptedJsonSync(
  encryptedJson,
  process.env.PRIVATE_KEY_PW
);

const TANGA_TOKEN_ADDRESS_ETHEREUM = process.env.TANGA_TOKEN_ADDRESS_ETHEREUM;
const TANGA_TOKEN_ADDRESS_POLYGON = process.env.TANGA_TOKEN_ADDRESS_POLYGON;

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
  const wallet_chain_1 = new ethers.Wallet(encryptedPk, chain1Provider);
  const wallet_chain_2 = new ethers.Wallet(encryptedPk, chain2Provider);
  console.log("Started monitoring chains [1, 2] for Lock transactions...");
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
      console.log("Waiting for the transaction result...");
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

      // ERC20 Contract Instance (chain_1)
      const ERC20_chain_1 = new ethers.Contract(
        // map_chain_2_tokenAddr_to_chain_1_tokenAddr[token],
        TANGA_TOKEN_ADDRESS_ETHEREUM,
        erc20_abi,
        wallet_chain_1
      );

      // Check if the same transaction is being executed the second time

      if (await chain_1_contract.processedNonces(nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
        return;
      }

      // Check if the balance of the contract
      const chain1_contract_balance = +ethers.utils.formatEther(
        await ERC20_chain_1.balanceOf(chain_1_bridge_contract_address)
      );
      const _amount = +ethers.utils.formatEther(amount);

      console.log({ chain1_contract_balance, _amount });

      if (chain1_contract_balance < _amount) {
        console.log(
          `Balance of the contract is less than the requested amount. Requested amount: ${_amount}, Contract balance: ${chain1_contract_balance}`
        );
        console.log("Reverting the action...");
        return;
      }

      // Unlock the same amount of tokens on chain 1 using the admin private key
      const tx = await chain_1_contract.connect(wallet_chain_1).unlockTokens(
        to,
        amount,
        //   map_chain_2_tokenAddr_to_chain_1_tokenAddr[token],
        TANGA_TOKEN_ADDRESS_ETHEREUM,
        nonce
      );
      console.log("Waiting for the transaction result...");
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
