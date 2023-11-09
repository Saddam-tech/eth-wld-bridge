const { ethers } = require("hardhat");
require("dotenv").config();

const { abi: weth_abi } = require("../artifacts/contracts/WETH.sol/WETH.json");
const {
  abi: ethereum_bridge_abi,
} = require("../artifacts/contracts/EthereumBridge.sol/EthereumBridge.json");

const TOKEN_ADDRESS_ETHEREUM = process.env.TOKEN_ADDRESS_ETHEREUM;
const TOKEN_ADDRESS_WORLDLAND = process.env.TOKEN_ADDRESS_WORLDLAND;

const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;

const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;

async function main() {
  const signer = await ethers.getSigner();

  // const nonce = await signer.getTransactionCount();
  // console.log({ nonce });

  const contract = new ethers.Contract(
    ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
    ethereum_bridge_abi,
    signer
  );

  // const stop = await contract.resume();

  // console.log({ stop });

  // const balanceOf = await contract.balanceOf(signer.address);
  // console.log({ balanceOf: ethers.utils.formatEther(balanceOf) });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
