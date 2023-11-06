const { ethers } = require("hardhat");

async function main() {
  const TokenBase = await ethers.getContractFactory("WETH");
  const MyToken = await TokenBase.deploy();

  await MyToken.deployed();

  console.log(`Token deployed to: ${MyToken.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
