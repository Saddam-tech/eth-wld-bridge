const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: ethereum_bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");

const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;

async function main() {
  const signer = await ethers.getSigner();

  const MyContract = new ethers.Contract(
    ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
    ethereum_bridge_abi,
    signer
  );
  // const tx = await MyContract.setFeeRate(ethers.utils.parseUnits("1", 18));
  // const tx = await MyContract.setFixedFee(ethers.utils.parseUnits("20", 18));
  //   const tx = await MyContract.feeToOwner();

  //   console.log({ tx: ethers.utils.formatUnits(tx, 18) });
  // console.log(tx);
  // const balance = ethers.utils.formatEther(await signer.getBalance());
  // console.log({ balance });

  const tx = await MyContract.setNetworkFee(
    0,
    process.env.WETH_ADDRESS_WORLDLAND,
    "WETH",
    ethers.utils.parseUnits("1", 17)
  );

  console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
