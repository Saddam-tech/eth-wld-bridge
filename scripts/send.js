const { ethers } = require("hardhat");
require("dotenv").config();

const TANGA_TOKEN_ADDRESS = "0x2f251755c4C4BC73A2C3C002f09D19f11b98485C"; // token address
const PRIVATE_KEY =
  "36ce51e7722a9dadedf6dedc8210f4949db2f7aa031d2d10190e8ea5312189d9";
const provider_ethereum = "https://rpc.lvscan.io";

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

  const provider = new ethers.providers.JsonRpcProvider(provider_ethereum);
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
