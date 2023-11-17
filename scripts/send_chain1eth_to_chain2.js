const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: ethereum_bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");

const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;
const WETH_ADDRESS_ETHEREUM = process.env.WETH_ADDRESS_ETHEREUM;

async function main() {
  const signer = await ethers.getSigner();

  const MyContract = new ethers.Contract(
    ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
    ethereum_bridge_abi,
    signer
  );
  const tx = await MyContract.lockETH(signer.address, WETH_ADDRESS_ETHEREUM, {
    value: ethers.utils.parseUnits("10", 18),
  });

  console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
