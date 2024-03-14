const { ethers } = require("hardhat");
require("dotenv").config();

const { abi: weth_abi } = require("../artifacts/contracts/WETH.sol/WETH.json");

const WETH_ADDRESS_WORLDLAND = process.env.WETH_ADDRESS_WORLDLAND;

async function main() {
  const signer = await ethers.getSigner(1);

  const WETH_CONTRACT = new ethers.Contract(
    WETH_ADDRESS_WORLDLAND,
    weth_abi,
    signer
  );

  let balance = await WETH_CONTRACT.balanceOf(signer.address);
  balance = ethers.utils.formatEther(balance);
  console.log({ balance });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
