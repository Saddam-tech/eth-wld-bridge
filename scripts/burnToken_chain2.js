const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: ethereum_bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");

const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
const TOKEN_ADDRESS_WORLDLAND = process.env.TOKEN_ADDRESS_WORLDLAND;

async function main() {
  const signer = await ethers.getSigner();

  const MyContract = new ethers.Contract(
    WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
    ethereum_bridge_abi,
    signer
  );
  const nonce = await signer.getTransactionCount();
  console.log({ nonce });
  const tx = await MyContract.burnToken(
    signer.address,
    ethers.utils.parseUnits("1", 18),
    TOKEN_ADDRESS_WORLDLAND,
    nonce,
    "DAI"
  );

  console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
