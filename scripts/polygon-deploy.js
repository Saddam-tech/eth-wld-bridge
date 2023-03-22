const { ethers } = require("hardhat");
require("dotenv").config();

const contract = "PolygonBridge";

async function main() {
  const MyContractFactory = await ethers.getContractFactory(contract);
  console.log("Deploying contract...");
  const MyContract = await MyContractFactory.deploy();
  await MyContract.deployed();
  const signer = await ethers.getSigner();
  const nonce = await signer.getTransactionCount();

  console.log({ MyContractAddress: MyContract.address });
  console.log({ signer, nonce });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
