const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: ethereum_bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");

const { abi: wwlc_abi } = require("../artifacts/contracts/WETH.sol/WETH.json");

const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;
const WWLC_ADDRESS_ETHEREUM = process.env.WETH_ADDRESS_ETHEREUM;

async function main() {
  const signer = await ethers.getSigner(1);

  const MyContract = new ethers.Contract(
    ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
    ethereum_bridge_abi,
    signer
  );
  const WWLC_CONTRACT = new ethers.Contract(
    WWLC_ADDRESS_ETHEREUM,
    wwlc_abi,
    signer
  );

  let allowance = ethers.utils.formatEther(
    await WWLC_CONTRACT.allowance(
      signer.address,
      ETHEREUM_BRIDGE_CONTRACT_ADDRESS
    )
  );

  if (Number(allowance) <= 0) {
    await WWLC_CONTRACT.approve(
      ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
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
    WWLC_ADDRESS_ETHEREUM,
    bridgeFee,
    {
      value: ethers.utils.parseUnits(total.toString(), 18),
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
