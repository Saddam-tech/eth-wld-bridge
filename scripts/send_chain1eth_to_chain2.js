const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: ethereum_bridge_abi,
} = require("../artifacts/contracts/EthereumBridge.sol/EthereumBridge.json");

const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;
const TOKEN_ADDRESS_ETHEREUM = process.env.TOKEN_ADDRESS_ETHEREUM;

const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
const TOKEN_ADDRESS_WORLDLAND = process.env.TOKEN_ADDRESS_WORLDLAND;

async function main() {
  const signer = await ethers.getSigner();

  // const MyContract = new ethers.Contract(
  //   ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
  //   ethereum_bridge_abi,
  //   signer
  // );
  const MyContract2 = new ethers.Contract(
    WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
    ethereum_bridge_abi,
    signer
  );
  const nonce = await signer.getTransactionCount();

  console.log({ NONCE: nonce });

  // const tx = await MyContract.lockETH(
  //   signer.address,
  //   TOKEN_ADDRESS_ETHEREUM,
  //   nonce,
  //   {
  //     value: ethers.utils.parseUnits("10", 18),
  //   }
  // );
  const tx2 = await MyContract2.lockETH(
    signer.address,
    TOKEN_ADDRESS_WORLDLAND,
    nonce,
    {
      value: ethers.utils.parseUnits("10", 18),
    }
  );
  tx2.wait();
  // console.log({ tx });
  console.log({ tx2 });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
