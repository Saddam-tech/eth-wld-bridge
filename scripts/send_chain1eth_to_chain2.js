const { ethers } = require("hardhat");
require("dotenv").config();

const ABI_ETHEREUM_BRIDGE = [
  "function lockTokens(address to, uint256 amount, string calldata tokenType, address token) external returns (void)",
  "function unlockTokens(address to, uint256 amount, address token, uint256 otherChainNonce) external returns (void)",
];
const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;

const TANGA_TOKEN_ADDRESS_ETHEREUM = process.env.TANGA_TOKEN_ADDRESS_ETHEREUM;

async function main() {
  const signer = await ethers.getSigner();
  const MyContract = new ethers.Contract(
    ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
    ABI_ETHEREUM_BRIDGE,
    signer
  );

  console.log({ MyContractAddress: MyContract.address });

  const tx = await MyContract.lockTokens(
    "0xE0429608F2f5Ee05a50aeDAbFC99e2f885793D88",
    ethers.utils.parseUnits("1", 18),
    "Tanga",
    TANGA_TOKEN_ADDRESS_ETHEREUM
  );
  tx.wait();

  console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
