const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: ethereum_bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");

const { abi: weth_abi } = require("../artifacts/contracts/WETH.sol/WETH.json");

const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
const WETH_ADDRESS_WORLDLAND = process.env.WETH_ADDRESS_WORLDLAND;

async function main() {
  const signer = await ethers.getSigner(1);
  const MyContract = new ethers.Contract(
    WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
    ethereum_bridge_abi,
    signer
  );
  const WETH_CONTRACT = new ethers.Contract(
    WETH_ADDRESS_WORLDLAND,
    weth_abi,
    signer
  );

  let allowance = ethers.utils.formatEther(
    await WETH_CONTRACT.allowance(
      signer.address,
      WORLDLAND_BRIDGE_CONTRACT_ADDRESS
    )
  );

  if (Number(allowance) <= 0) {
    await WETH_CONTRACT.approve(
      WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
      ethers.utils.parseUnits("1000000", 18)
    );
  }

  const bridgeFee = await MyContract.getBridgeFee(
    ethers.utils.parseUnits("1", 18)
  );

  const parsedFee = ethers.utils.formatEther(bridgeFee);
  const total = 1 + Number(parsedFee);

  const tx = await MyContract.lockETH(
    signer.address,
    WETH_ADDRESS_WORLDLAND,
    bridgeFee,
    {
      value: ethers.utils.parseUnits(total.toString(), 18),
    }
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
