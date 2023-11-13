const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const signer = await ethers.getSigner();

  const nonce = await signer.getTransactionCount();

  console.log({ nonce });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
