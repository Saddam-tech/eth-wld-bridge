const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: wrappedETH_contract_abi,
} = require("../artifacts/contracts/WrapEth.sol/WrapETH.json");

const wlETH_localhost_1 = process.env.wlETH_localhost_1;

async function main() {
  const amount_to_send = ethers.utils.parseEther("10");
  const signer = await ethers.getSigner();
  const MyContract = new ethers.Contract(
    wlETH_localhost_1,
    wrappedETH_contract_abi,
    signer
  );

  console.log({ MyContractAddress: MyContract.address });

  const tx = await MyContract.deposit({ value: amount_to_send });
  tx.wait();

  console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
