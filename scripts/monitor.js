const { ethers } = require("hardhat");
require("dotenv").config();

// Specify the lock contract addresses and ABIs for both chains
const chain1LockAddress = process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;
const chain1LockABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed amount, address token, string tokenType, uint256 nonce)",
];
const chain2LockAddress = "0x2345678901234567890123456789012345678901";
const chain2LockABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed amount, address token, string tokenType, uint256 nonce)",
];

// Specify the mint contract addresses and ABIs for both chains
const chain1MintAddress = process.env.POLYGON_BRIDGE_CONTRACT_ADDRESS;
const chain1MintABI = [
  "function mint(address to, uint256 amount, address token, string calldata tokenType, uint256 otherChainNonce) external",
];
const chain2MintAddress = process.env.POLYGON_BRIDGE_CONTRACT_ADDRESS;
const chain2MintABI = [
  "function mint(address to, uint256 amount, address token, string calldata tokenType, uint256 otherChainNonce) external",
];

// Specify the admin private key
const privateKey = process.env.PRIVATE_KEY;

const TANGA_TOKEN_ADDRESS_POLYGON = process.env.TANGA_TOKEN_ADDRESS_POLYGON;

async function monitorLockEvents() {
  // Connect to both chains using the JsonRpcProvider class
  const chain1Provider = new ethers.providers.JsonRpcProvider(
    "http://localhost:8545"
  );
  const chain2Provider = new ethers.providers.JsonRpcProvider(
    "http://localhost:8546"
  );

  // Create Contract instances for the lock contracts on both chains
  const chain1LockContract = new ethers.Contract(
    chain1LockAddress,
    chain1LockABI,
    chain1Provider
  );
  const chain2LockContract = new ethers.Contract(
    chain2LockAddress,
    chain2LockABI,
    chain2Provider
  );

  // Create Contract instances for the mint contracts on both chains
  const chain1MintContract = new ethers.Contract(
    chain1MintAddress,
    chain1MintABI,
    chain1Provider
  );
  const chain2MintContract = new ethers.Contract(
    chain2MintAddress,
    chain2MintABI,
    chain2Provider
  );
  // Get a wallet using the admin private key
  const wallet = new ethers.Wallet(privateKey, chain1Provider);
  console.log("Started monitoring Ethereum chain for Lock transactions...");
  // Listen for the Lock event on the chain1LockContract
  chain1LockContract.on(
    "Transfer",
    async (from, to, amount, token, tokenType, nonce) => {
      console.log(
        "<<<<<<<<<< Lock event detected on Ethereum chain >>>>>>>>>>> "
      );
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("token: ", token);
      console.log("token_name: ", tokenType);
      console.log("nonce: ", nonce);

      // Mint the same amount of tokens on chain 2 using the admin private key
      const tx = await chain2MintContract
        .connect(wallet)
        .mint(to, amount, TANGA_TOKEN_ADDRESS_POLYGON, tokenType, nonce);
      console.log(
        `Minted equivalent amount of ${tokenType} to ${to} on Mumbai Testnet`
      );
      console.log({ tx });
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
//     const tx = await chain2MintContract
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
//   chain1LockContract.on("Transfer", handleTransferEvent);
//   console.log("Started listening for Transfer events on Ethereum chain...");
// }

// main().catch((err) => {
//   console.log("Error in the main function: ", err);
//   process.exit(1);
// });
