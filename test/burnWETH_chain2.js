const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: worldland_bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");

const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
const WETH_ADDRESS_WORLDLAND = process.env.WETH_ADDRESS_WORLDLAND;

async function main() {
  const signer = await ethers.getSigner();

  const MyContract = new ethers.Contract(
    WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
    worldland_bridge_abi,
    signer
  );
  const tx = await MyContract.burnWETH(
    ethers.utils.parseUnits("1", 18),
    WETH_ADDRESS_WORLDLAND
  );

  console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
