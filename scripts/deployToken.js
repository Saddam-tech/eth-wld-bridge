const { ethers } = require("hardhat");

async function main() {
  const MyToken = await ethers.getContractFactory("TokenBase");
  const LVE = await MyToken.deploy("Tanga", "Tanga");

  await LVE.deployed();

  console.log(`Token deployed to: ${LVE.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
