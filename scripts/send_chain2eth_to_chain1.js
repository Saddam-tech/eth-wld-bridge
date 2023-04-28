const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: polygon_bridge_abi,
} = require("../artifacts/contracts/PolygonBridge.sol/PolygonBridge.json");

const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;

const TOKEN_ADDRESS_WORLDLAND = process.env.TOKEN_ADDRESS_WORLDLAND;

async function main() {
  const signer = await ethers.getSigner();
  const MyContract = new ethers.Contract(
    WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
    polygon_bridge_abi,
    signer
  );

  console.log({ MyContractAddress: MyContract.address });

  const tx = await MyContract.lockTokens(
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    ethers.utils.parseUnits("10", 18),
    "Tanga",
    TOKEN_ADDRESS_WORLDLAND
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
