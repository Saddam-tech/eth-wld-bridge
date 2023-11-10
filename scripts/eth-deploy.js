const { ethers } = require("hardhat");
require("dotenv").config();

const contract = "BridgeBase";

async function main() {
  const MyContractFactory = await ethers.getContractFactory(contract);
  console.log("Deploying contract...");
  const MyContract = await MyContractFactory.deploy();
  await MyContract.deployed();
  const signer = await ethers.getSigner();
  const nonce = await signer.getTransactionCount();

  console.log(`Deployed contract at: ${MyContract.address}`);
  console.log({ signer: signer.address, nonce });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
