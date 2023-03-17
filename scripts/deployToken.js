const { ethers } = require("hardhat");

async function main() {
  const MyToken = await ethers.getContractFactory("TokenBase");
  const GoerliETH = await MyToken.deploy("GoerliETH", 1000000);

  await GoerliETH.deployed();

  console.log(`GoerliETH deployed to: ${GoerliETH.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
