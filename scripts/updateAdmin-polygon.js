const { ethers } = require("hardhat");
require("dotenv").config();

const TANGA_TOKEN_ADDRESS = process.env.TANGA_TOKEN_ADDRESS_POLYGON; // token address
const POLYGON_BRIDGE_CONTRACT_ADDRESS =
  process.env.POLYGON_BRIDGE_CONTRACT_ADDRESS;

const erc20ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function updateAdmin(address newAdmin) external",
];

async function mintAndSendToken() {
  // connect to the deployed contract address
  const contractAddress = TANGA_TOKEN_ADDRESS;
  const signer = await ethers.getSigner();
  const erc20Contract = new ethers.Contract(
    contractAddress,
    erc20ABI,
    ethers.provider
  );

  // updating admin of the erc20 token(setting the polygon contract as an owner of the token(for it to be able to mint ))
  const tx = await erc20Contract
    .connect(signer)
    .updateAdmin(POLYGON_BRIDGE_CONTRACT_ADDRESS);
  await tx.wait();

  console.log(
    `Sent the privilege of erc20 at ${TANGA_TOKEN_ADDRESS} to ${POLYGON_BRIDGE_CONTRACT_ADDRESS}`
  );
}

mintAndSendToken()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
