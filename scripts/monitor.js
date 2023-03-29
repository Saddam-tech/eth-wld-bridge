const { ethers } = require("hardhat");
require("dotenv").config();

// Specify the lock contract addresses and ABIs for both chains
const chain1LockAddress = process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;
const chain1LockABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed amount, address token, string tokenType, uint256 nonce)",
];

const chain2MintAddress = process.env.POLYGON_BRIDGE_CONTRACT_ADDRESS;
const chain2MintABI = [
  "function mint( address to, uint256 amount, address token, string calldata tokenType, uint256 otherChainNonce) external",
];

// Specify the admin private key
const privateKey = process.env.PRIVATE_KEY;

const TANGA_TOKEN_ADDRESS_POLYGON = process.env.TANGA_TOKEN_ADDRESS_POLYGON;
const TANGA_TOKEN_ADDRESS_ETHEREUM = process.env.TANGA_TOKEN_ADDRESS_ETHEREUM;

async function monitorLockEvents() {
  // Connect to both chains using the JsonRpcProvider class
  const chain1Provider = new ethers.providers.JsonRpcProvider(
    "http://127.0.0.1:8545/"
  );
  const chain2Provider = new ethers.providers.JsonRpcProvider(
    "http://127.0.0.1:8546"
  );

  // Create Contract instances for the lock contracts on both chains
  const chain_1_contract = new ethers.Contract(
    chain1LockAddress,
    chain1LockABI,
    chain1Provider,
    { gasLimit: 100000 }
  );

  const chain_2_contract = new ethers.Contract(
    chain2MintAddress,
    chain2MintABI,
    chain2Provider
  );
  // Get a wallet using the admin private key
  const wallet_chain_1 = new ethers.Wallet(privateKey, chain1Provider);
  const wallet_chain_2 = new ethers.Wallet(privateKey, chain2Provider);
  console.log("Started monitoring Ethereum chain for Lock transactions...");
  // Listen for the Lock event on the chain_1_contract
  chain_1_contract.on(
    "Transfer",
    async (from, to, amount, token, tokenType, nonce) => {
      console.log(
        `<<<<<<<<<< Lock event detected on http://127.0.0.1:8545 >>>>>>>>>>>`
      );
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("token: ", token);
      console.log("token_name: ", tokenType);
      console.log("nonce: ", nonce);

      // Mint the same amount of tokens on chain 2 using the admin private key
      const tx = await chain_2_contract
        .connect(wallet_chain_2)
        .mint(
          wallet_chain_2.address,
          amount,
          TANGA_TOKEN_ADDRESS_POLYGON,
          tokenType,
          nonce
        );
      await tx.wait();
      console.log(
        `Minted equivalent amount of ${tokenType} to ${to} on http://127.0.0.1:8546`
      );
      console.log(`Txhash: ${tx.hash}`);
    }
  );
  chain_2_contract.on(
    "Transfer",
    async (from, to, amount, token, tokenType, nonce) => {
      console.log(
        `<<<<<<<<<< Lock event detected on http://127.0.0.1:8546 >>>>>>>>>>>`
      );
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("token: ", token);
      console.log("token_name: ", tokenType);
      console.log("nonce: ", nonce);

      // Mint the same amount of tokens on chain 2 using the admin private key
      const tx = await chain_1_contract
        .connect(wallet_chain_1)
        .unlock(
          wallet_chain_1.address,
          amount,
          TANGA_TOKEN_ADDRESS_ETHEREUM,
          tokenType,
          nonce
        );
      await tx.wait();
      console.log(
        `Unlocked equivalent amount of ${tokenType} to ${to} on http://127.0.0.1:8545`
      );
      console.log(`Txhash: ${tx.hash}`);
    }
  );
}

monitorLockEvents().catch((err) => {
  console.log(err);
  process.exit(1);
});

// async function handleTransferEvent(event) {
//   const { from, to, amount, token, tokenType, nonce } = event?.args;
//   console.log(
//     `Lock event detected on Ethereum chain: from ${from}, to ${to}, amount ${amount} of token ${token}(${tokenType}. Number of txs are ${nonce})`
//   );

//   try {
//     const wallet = new ethers.Wallet(privateKey, chain1Provider);
//     // Mint the same amount of tokens on chain 2 using the admin private key
//     const tx = await chain_2_contract
//       .connect(wallet)
//       .mint(to, amount, token, tokenType, nonce);
//     tx.wait();
//     console.log({ tx });
//     console.log(`Mint transaction sent to chain 2: ${tx.hash}`);
//   } catch (err) {
//     console.log(err);
//   }
// }

// async function main() {
//   chain_1_contract.on("Transfer", handleTransferEvent);
//   console.log("Started listening for Transfer events on Ethereum chain...");
// }

// main().catch((err) => {
//   console.log("Error in the main function: ", err);
//   process.exit(1);
// });
