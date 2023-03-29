const { ethers } = require("hardhat");
require("dotenv").config();

const TANGA_TOKEN_ADDRESS = process.env.TANGA_TOKEN_ADDRESS_POLYGON; // token address
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const POLYGON_BRIDGE_CONTRACT_ADDRESS =
  process.env.POLYGON_BRIDGE_CONTRACT_ADDRESS;

const erc20ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function updateAdmin(address newAdmin) external",
];

async function mintAndSendToken() {
  // connect to the deployed contract address
  const contractAddress = TANGA_TOKEN_ADDRESS;
  const privateKey = PRIVATE_KEY;

  const provider = new ethers.providers.JsonRpcProvider(
    "http://127.0.0.1:8546/"
  );
  const wallet = new ethers.Wallet(privateKey, provider);
  const erc20Contract = new ethers.Contract(contractAddress, erc20ABI, wallet);

  // updating admin of the erc20 token(setting the polygon contract as an owner of the token(for it to be able to mint ))
  const tx = await erc20Contract.updateAdmin(POLYGON_BRIDGE_CONTRACT_ADDRESS);
  await tx.wait();

  console.log(
    `Sent the privilege of erc20 at ${TANGA_TOKEN_ADDRESS} to ${POLYGON_BRIDGE_CONTRACT_ADDRESS}`
  );
}

mintAndSendToken();
