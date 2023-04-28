const { ethers } = require("hardhat");
require("dotenv").config();

const TANGA_TOKEN_ADDRESS = process.env.TOKEN_ADDRESS_WORLDLAND; // token address

const erc20ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address recipient, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) public",
  "function updateAdmin(address newAdmin) external",
];

async function mintAndSendToken() {
  // connect to the deployed contract address
  const contractAddress = TANGA_TOKEN_ADDRESS;
  const amount = ethers.utils.parseEther("100000000");

  const signer = await ethers.getSigner();
  const wallet_address = await signer.getAddress();
  const erc20Contract = new ethers.Contract(
    contractAddress,
    erc20ABI,
    ethers.provider
  ).connect(signer);
  const balanceBefore = await erc20Contract.balanceOf(wallet_address);

  // minting point
  const tx = await erc20Contract.mint(wallet_address, amount);
  await tx.wait();

  const balanceAfter = await erc20Contract.balanceOf(wallet_address);

  console.log(
    `Minted ${ethers.utils.formatEther(
      amount
    )} of ${contractAddress}  to ${wallet_address}. The balance before: ${ethers.utils.formatEther(
      balanceBefore
    )} and after: ${ethers.utils.formatEther(balanceAfter)}`
  );
}

mintAndSendToken();
