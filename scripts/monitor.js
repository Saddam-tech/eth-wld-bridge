require("dotenv").config();
const { ethers } = require("hardhat");

const ethereumRpcUrl = process.env.ETHEREUM_RPC_URL;
const bscRpcUrl = process.env.BSC_RPC_URL;
const ethereumPrivateKey = process.env.ETHEREUM_PRIVATE_KEY;
const bscPrivateKey = process.env.BSC_PRIVATE_KEY;

const ethereumProvider = new ethers.providers.JsonRpcProvider(ethereumRpcUrl);
const bscProvider = new ethers.providers.JsonRpcProvider(bscRpcUrl);

const ethereumWallet = new ethers.Wallet(ethereumPrivateKey, ethereumProvider);
const bscWallet = new ethers.Wallet(bscPrivateKey, bscProvider);

// Bridge contract addresses and ABI
const ethereumBridgeAddress = "0x...";
const bscBridgeAddress = "0x...";
const bridgeAbi = [
  // ABI JSON here
];

const ethereumBridge = new ethers.Contract(
  ethereumBridgeAddress,
  bridgeAbi,
  ethereumWallet
);
const bscBridge = new ethers.Contract(bscBridgeAddress, bridgeAbi, bscWallet);

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const monitor = async () => {
  const ethFilter = ethereumBridge.filters.Transfer();
  const bscFilter = bscBridge.filters.Transfer();

  let ethLatestBlock = await ethereumProvider.getBlockNumber();
  let bscLatestBlock = await bscProvider.getBlockNumber();

  while (true) {
    const currentEthBlock = await ethereumProvider.getBlockNumber();
    const currentBscBlock = await bscProvider.getBlockNumber();

    if (currentEthBlock > ethLatestBlock) {
      const logs = await ethereumProvider.getLogs({
        ...ethFilter,
        fromBlock: ethLatestBlock + 1,
        toBlock: currentEthBlock,
      });

      for (const log of logs) {
        const event = ethereumBridge.interface.parseLog(log);
        console.log("Detected Ethereum Transfer event:", event.args);

        const tx = await bscBridge.unlockTokens(
          event.args.from,
          event.args.to,
          event.args.amount,
          event.args.nonce,
          { gasLimit: 200000 }
        );
        await tx.wait();
        console.log("Tokens unlocked on BSC");
      }

      ethLatestBlock = currentEthBlock;
    }

    if (currentBscBlock > bscLatestBlock) {
      const logs = await bscProvider.getLogs({
        ...bscFilter,
        fromBlock: bscLatestBlock + 1,
        toBlock: currentBscBlock,
      });

      for (const log of logs) {
        const event = bscBridge.interface.parseLog(log);
        console.log("Detected BSC Transfer event:", event.args);

        const tx = await ethereumBridge.unlockTokens(
          event.args.from,
          event.args.to,
          event.args.amount,
          event.args.nonce,
          { gasLimit: 200000 }
        );
        await tx.wait();
        console.log("Tokens unlocked on Ethereum");
      }

      bscLatestBlock = currentBscBlock;
    }

    await sleep(15000);
  }
};

monitor().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
