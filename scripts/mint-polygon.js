const { ethers } = require("hardhat");
require("dotenv").config();

const ABI_ETHEREUM_BRIDGE = [
  "function mint(address to, uint256 amount, address token, string calldata tokenType, uint256 otherChainNonce) external",
];
const POLYGON_BRIDGE_CONTRACT_ADDRESS =
  process.env.POLYGON_BRIDGE_CONTRACT_ADDRESS;

const TANGA_TOKEN_ADDRESS_POLYGON = process.env.TANGA_TOKEN_ADDRESS_POLYGON;

async function main() {
  // const provider = ethers.provider;

  // const signer = new ethers.Wallet(process.env.PRIVATE_KEY_1, provider);
  const signer = await ethers.getSigner();
  const nonce = await signer.getTransactionCount();
  const MyContract = new ethers.Contract(
    POLYGON_BRIDGE_CONTRACT_ADDRESS,
    ABI_ETHEREUM_BRIDGE,
    signer,
    { gasLimit: 100000 }
  );

  console.log({ MyContractAddress: MyContract.address });

  console.log({
    signer: await signer.getAddress(),
    amount: ethers.utils.parseUnits("24", 18),
    TANGA_TOKEN_ADDRESS_POLYGON,
    tokenType: "Tanga",
    nonce,
  });

  console.log({ ADMIN: await MyContract.owner() });

  //   const tx = await MyContract.mint(
  //     await signer.getAddress(),
  //     ethers.utils.parseUnits("24", 18),
  //     TANGA_TOKEN_ADDRESS_POLYGON,
  //     "Tanga",
  //     nonce,
  //     { gasLimit: 100000 }
  //   );
  //   tx.wait();

  //   console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
