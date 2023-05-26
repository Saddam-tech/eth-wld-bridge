const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: wrappedETH_contract_abi,
} = require("../artifacts/contracts/WrapEth.sol/WrapETH.json");

const wETH_localhost_1 = process.env.wETH_localhost_1;

async function main() {
  const signer = await ethers.getSigner();
  const amount_to_send = ethers.utils.parseEther("10");
  const nonce = await signer.getTransactionCount();
  console.log({ amount_to_send, nonce });
  const MyContract = new ethers.Contract(
    wETH_localhost_1,
    wrappedETH_contract_abi,
    signer
  );
  // const tx = await MyContract.deposit(nonce, { value: amount_to_send });
  // const tx = await MyContract.setFee(5, 2000);
  // tx.wait();
  // console.log({ tx });

  const tx = await MyContract.balanceOf(
    "0x403746C0D8e91aB0ad15008ab2488036dFb27d3F"
  );
  console.log({ tx });
  // const tx = await MyContract.setFee(5, 2000);
  // const tx = await MyContract.feeToOwner();
  // console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
