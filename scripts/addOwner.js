require("dotenv").config();
const { ethers } = require("hardhat");

const {
  abi: bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");

const { abi: weth_abi } = require("../artifacts/contracts/WETH.sol/WETH.json");

const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;
const WETH_ADDRESS_ETHEREUM = process.env.WETH_ADDRESS_ETHEREUM;
const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
const WETH_ADDRESS_WORLDLAND = process.env.WETH_ADDRESS_WORLDLAND;

async function main() {
  try {
    const signer = await ethers.getSigner();

    const newOwnerAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";

    const contract0 = new ethers.Contract(
      ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
      bridge_abi,
      signer
    );
    const contract1 = new ethers.Contract(
      WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
      bridge_abi,
      signer
    );

    const tx1 = await contract0.addOwner(newOwnerAddress);
    const tx2 = await contract1.addOwner(newOwnerAddress);

    // const tx2 = await contract1.getOwners();
    // console.log({ tx1 });
    console.log({ tx2 });
  } catch (err) {
    console.log(err);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
