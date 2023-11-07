const { ethers } = require("hardhat");
require("dotenv").config();

const { abi: weth_abi } = require("../artifacts/contracts/WETH.sol/WETH.json");

const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;
const TOKEN_ADDRESS_ETHEREUM = process.env.TOKEN_ADDRESS_ETHEREUM;

const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
const TOKEN_ADDRESS_WORLDLAND = process.env.TOKEN_ADDRESS_WORLDLAND;

async function main() {
  const signer = await ethers.getSigner();
  // const MyContract = new ethers.Contract(
  //   TOKEN_ADDRESS_ETHEREUM,
  //   weth_abi,
  //   signer
  // );
  const MyContract2 = new ethers.Contract(
    TOKEN_ADDRESS_WORLDLAND,
    weth_abi,
    signer
  );
  // const tx = await MyContract.transferOwnership(
  //   ETHEREUM_BRIDGE_CONTRACT_ADDRESS
  // );
  const tx2 = await MyContract2.transferOwnership(
    WORLDLAND_BRIDGE_CONTRACT_ADDRESS
  );
  // tx.wait();
  tx2.wait();

  // console.log({ tx });
  console.log({ tx2 });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
