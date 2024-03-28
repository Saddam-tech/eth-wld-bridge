const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: ethereum_bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const {
  abi: erc20_abi,
} = require("../artifacts/contracts/ERC20Custom.sol/ERC20Custom.json");

const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
const TOKEN_ADDRESS_WORLDLAND = process.env.TOKEN_ADDRESS_WORLDLAND;

async function main() {
  const signer = await ethers.getSigner();

  const MyContract = new ethers.Contract(
    WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
    ethereum_bridge_abi,
    signer
  );
  const ERC20 = new ethers.Contract(TOKEN_ADDRESS_WORLDLAND, erc20_abi, signer);
  const allowance = parseFloat(
    ethers.utils.formatUnits(
      await ERC20.allowance(MyContract.address, signer.address)
    )
  );
  if (allowance === 0) {
    console.log("Insufficient allowance! Approving...");
    await ERC20.approve(
      MyContract.address,
      ethers.utils.parseUnits("10000000", 18)
    );
  }

  const bridgeFee = await MyContract.getBridgeFee(
    ethers.utils.parseUnits("10", 18)
  );
  const parsedFee = ethers.utils.formatEther(bridgeFee);
  const total = 10 + Number(parsedFee);
  const tx = await MyContract.burnToken(
    signer.address,
    bridgeFee,
    TOKEN_ADDRESS_WORLDLAND,
    ethers.utils.parseUnits(total.toString(), 18),
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
