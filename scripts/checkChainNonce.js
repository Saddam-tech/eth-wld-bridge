const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");

const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;

async function main() {
  const signer = await ethers.getSigner();

  const MyContract = new ethers.Contract(
    ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
    bridge_abi,
    signer
  );
  const _nonce = await MyContract._nonce();
  const check = await MyContract.processedNonces(30);
  console.log({ _nonce, check });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
