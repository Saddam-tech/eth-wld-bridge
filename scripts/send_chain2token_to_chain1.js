const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const {
  abi: erc20_abi,
} = require("../artifacts/contracts/ERC20Custom.sol/ERC20Custom.json");

const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
const TOKEN_ADDRESS_WORLDLAND = process.env.TOKEN_ADDRESS_WORLDLAND;

async function main() {
  const signer = await ethers.getSigner(1);

  const MyContract = new ethers.Contract(
    WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
    bridge_abi,
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
    ERC20.approve(MyContract.address, ethers.utils.parseUnits("10000000", 18));
  }
  const tx = await MyContract.lockToken(
    signer.address,
    ethers.utils.parseUnits("10", 18),
    "DAI",
    TOKEN_ADDRESS_WORLDLAND
  );

  console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
