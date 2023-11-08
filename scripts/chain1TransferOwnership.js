const { ethers } = require("hardhat");
require("dotenv").config();

const { abi: weth_abi } = require("../artifacts/contracts/WETH.sol/WETH.json");

const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;
const TOKEN_ADDRESS_ETHEREUM = process.env.TOKEN_ADDRESS_ETHEREUM;

async function main() {
  const signer = await ethers.getSigner();
  const MyContract = new ethers.Contract(
    TOKEN_ADDRESS_ETHEREUM,
    weth_abi,
    signer
  );

  const tx = await MyContract.transferOwnership(
    ETHEREUM_BRIDGE_CONTRACT_ADDRESS
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
