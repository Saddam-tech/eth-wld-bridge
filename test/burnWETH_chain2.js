const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: worldland_bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const { abi: weth_abi } = require("../artifacts/contracts/WETH.sol/WETH.json");

const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
const WETH_ADDRESS_WORLDLAND = process.env.WETH_ADDRESS_WORLDLAND;

async function main() {
  const signer = await ethers.getSigner();

  const MyContract = new ethers.Contract(
    WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
    worldland_bridge_abi,
    signer
  );
  const WETH = new ethers.Contract(WETH_ADDRESS_WORLDLAND, weth_abi, signer);
  const allowance = parseFloat(
    ethers.utils.formatUnits(
      await WETH.allowance(MyContract.address, signer.address)
    )
  );
  if (allowance === 0) {
    console.log("Insufficient allowance! Approving...");
    await WETH.approve(
      MyContract.address,
      ethers.utils.parseUnits("10000000", 18)
    );
  }
  const bridgeFee = await MyContract.getBridgeFee(
    ethers.utils.parseUnits("10", 18)
  );
  const parsedFee = ethers.utils.formatEther(bridgeFee);
  const total = 10 + Number(parsedFee);
  const tx = await MyContract.burnWETH(
    signer.address,
    bridgeFee,
    ethers.utils.parseUnits(total.toString(), 18),
    WETH_ADDRESS_WORLDLAND,
    {
      value: "0x00",
    }
  );

  console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
