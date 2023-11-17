const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: ethereum_bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");

const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;
const WETH_ADDRESS_ETHEREUM = process.env.WETH_ADDRESS_ETHEREUM;

async function main() {
  try {
    let signers = [];
    let rawTxArr = [];
    for (let i = 1; i < 10; i++) {
      const signer = (await ethers.getSigners())[i];
      signers.push(signer);
    }
    await Promise.all(signers);
    for (let i = 0; i < signers.length; i++) {
      const MyContract = new ethers.Contract(
        ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
        ethereum_bridge_abi,
        signers[i]
      );
      const tx = MyContract.lockETH(
        signers[i]?.address,
        WETH_ADDRESS_ETHEREUM,
        {
          value: ethers.utils.parseUnits("10", 18),
        }
      );
      rawTxArr.push(tx);
    }
    let batchExec = await Promise.all(rawTxArr);
    console.log({ batchExec });
  } catch (err) {
    console.log(err);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
