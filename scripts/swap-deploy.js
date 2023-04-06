const { ethers } = require("hardhat");
require("dotenv").config();

const contract = "MintAsReceived";

// deployed = 0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0

async function main() {
  const MyContractFactory = await ethers.getContractFactory(contract);
  console.log("Deploying contract...");
  const MyContract = await MyContractFactory.deploy("WLD", "WLD");
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
