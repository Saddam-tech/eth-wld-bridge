const { ethers } = require("hardhat");
require("dotenv").config();

const bridge_abi = require("../artifacts/contracts/EthereumBridge.sol/EthereumBridge.json");

const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;

const TANGA_TOKEN_ADDRESS_ETHEREUM = process.env.TANGA_TOKEN_ADDRESS_ETHEREUM;

async function main() {
  const signer = await ethers.getSigner();
  const MyContract = new ethers.Contract(
    ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
    bridge_abi.abi,
    signer
  );

  console.log({ MyContractAddress: MyContract.address });

  const tx = await MyContract.processedNonces(9);

  console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
