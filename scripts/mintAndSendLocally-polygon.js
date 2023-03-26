const { ethers } = require("hardhat");
require("dotenv").config();

const TANGA_TOKEN_ADDRESS = process.env.TANGA_TOKEN_ADDRESS_POLYGON; // token address
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const erc20ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address recipient, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) public",
];

async function mintAndSendToken() {
  // connect to the deployed contract address
  const contractAddress = TANGA_TOKEN_ADDRESS;
  const privateKey = PRIVATE_KEY;
  const amount = ethers.utils.parseEther("1000");

  const provider = new ethers.providers.JsonRpcProvider(
    "http://127.0.0.1:8545/"
  );
  const wallet = new ethers.Wallet(privateKey, provider);
  const erc20Contract = new ethers.Contract(contractAddress, erc20ABI, wallet);
  const balanceBefore = await erc20Contract.balanceOf(wallet.address);

  // minting point
  const tx = await erc20Contract.mint(wallet.address, amount);
  await tx.wait();

  const balanceAfter = await erc20Contract.balanceOf(wallet.address);

  console.log(
    `Minted ${ethers.utils.formatEther(amount)} of ${contractAddress}  to ${
      wallet.address
    }. The balance before: ${ethers.utils.formatEther(
      balanceBefore
    )} and after: ${ethers.utils.formatEther(balanceAfter)}`
  );
}

mintAndSendToken();
