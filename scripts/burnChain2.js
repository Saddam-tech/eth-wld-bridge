const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: worldland_bridge_abi,
} = require("../artifacts/contracts/WorldlandBridge.sol/WorldlandBridge.json");

const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
const TOKEN_ADDRESS_WORLDLAND = process.env.TOKEN_ADDRESS_WORLDLAND;

async function main() {
  const signer = await ethers.getSigner();

  const MyContract = new ethers.Contract(
    WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
    worldland_bridge_abi,
    signer
  );
  const nonce = await signer.getTransactionCount();
  console.log({ nonce });
  const tx = await MyContract.burnWETH(
    ethers.utils.parseUnits("0.99", 18),
    TOKEN_ADDRESS_WORLDLAND,
    nonce
  );

  console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
