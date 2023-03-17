const { ethers } = require("hardhat");
require("dotenv").config();

const GOERLIETH_ADDRESS = process.env.GOERLIETH_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS;
const GOERLI_INFURA_API_KEY = process.env.GOERLI_INFURA_API_KEY;

const erc20ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address recipient, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) public",
];

async function mintAndSendToken() {
  // connect to the deployed contract address
  const contractAddress = GOERLIETH_ADDRESS;
  const privateKey = PRIVATE_KEY;
  const amount = ethers.utils.parseEther("1000");

  const provider = new ethers.providers.AlchemyProvider(
    "goerli",
    "1CXoKBwOwKiTum1ahEB-RHeXWYzELT49"
  );
  console.log({ provider });
  const wallet = new ethers.Wallet(privateKey, provider);
  const erc20Contract = new ethers.Contract(contractAddress, erc20ABI, wallet);

  // minting point
  const tx = await erc20Contract.mint(wallet.address, amount);
  await tx.wait();

  const balanceOf = erc20Contract.balancesOf(wallet.address);

  console.log(
    `Minted ${ethers.utils.formatEther(balanceOf)} to ${wallet.address}`
  );

  //   // transfer the minted amount to the user's wallet address
  //   const balanceBefore = await erc20Contract.balanceOf(recipientAddress);
  //   await erc20Contract.transfer(recipientAddress, amount);
  //   const balanceAfter = await erc20Contract.balanceOf(recipientAddress);

  //   console.log(
  //     `Transfered ${ethers.utils.formatEther(amount)} tokens from ${
  //       wallet.address
  //     } to ${recipientAddress}`
  //   );
  //   console.log(
  //     `Recipient balance before ${ethers.utils.formatEther(
  //       balanceBefore
  //     )}, after ${ethers.utils.formatEther(balanceAfter)}`
  //   );
}

mintAndSendToken();
