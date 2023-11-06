const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: ethereum_bridge_abi,
} = require("../artifacts/contracts/EthereumBridge.sol/EthereumBridge.json");

const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;

async function main() {
  const signer = await ethers.getSigner();
  const MyContract = new ethers.Contract(
    ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
    ethereum_bridge_abi,
    signer
  );
  const nonce = await signer.getTransactionCount();

  console.log({ NONCE: nonce });

  const tx = await MyContract.lockETH(
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    nonce,
    {
      value: ethers.utils.parseUnits("1", 18),
    }
  );
  tx.wait();

  console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
