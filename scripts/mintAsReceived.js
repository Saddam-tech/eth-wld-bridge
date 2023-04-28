const { ethers } = require("hardhat");
require("dotenv").config();

const ABI_ETHEREUM_BRIDGE = [
  "function mint(address to, uint256 amount, address token, string calldata tokenType, uint256 otherChainNonce) external",
];
const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;

const TOKEN_ADDRESS_WORLDLAND = process.env.TOKEN_ADDRESS_WORLDLAND;

async function main() {
  // const provider = ethers.provider;

  // const signer = new ethers.Wallet(process.env.PRIVATE_KEY_1, provider);
  const signer = await ethers.getSigner();
  const nonce = await signer.getTransactionCount();
  const MyContract = new ethers.Contract(
    WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
    ABI_ETHEREUM_BRIDGE,
    signer
  );

  console.log({ MyContractAddress: MyContract.address });

  const tx = await MyContract.mint(
    await signer.getAddress(),
    ethers.utils.parseUnits("24", 18),
    TOKEN_ADDRESS_WORLDLAND,
    "Tanga",
    nonce
  );
  tx.wait();

  // console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
