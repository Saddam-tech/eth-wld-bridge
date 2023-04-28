const { ethers } = require("hardhat");

async function main() {
  const TokenBase = await ethers.getContractFactory("TokenBase");
  const MyToken = await TokenBase.deploy("wlLVT", "wlLVT");

  await MyToken.deployed();

  console.log(`Token deployed to: ${MyToken.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
