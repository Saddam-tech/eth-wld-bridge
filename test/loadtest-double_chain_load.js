const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");

const { abi: weth_abi } = require("../artifacts/contracts/WETH.sol/WETH.json");

const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;
const WETH_ADDRESS_ETHEREUM = process.env.WETH_ADDRESS_ETHEREUM;
const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
const WETH_ADDRESS_WORLDLAND = process.env.WETH_ADDRESS_WORLDLAND;

async function main() {
  try {
    let signers = [];
    let rawTxArr = [];
    for (let i = 1; i < 11; i++) {
      const signer = (await ethers.getSigners())[i];
      signers.push(signer);
    }
    await Promise.all(signers);
    const provider0 = new ethers.providers.JsonRpcProvider(
      process.env.provider_chain_1
    );
    const provider1 = new ethers.providers.JsonRpcProvider(
      process.env.provider_chain_2
    );
    const contract0 = new ethers.Contract(
      ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
      bridge_abi,
      provider0
    );
    const contract1 = new ethers.Contract(
      WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
      bridge_abi,
      provider1
    );
    const bridgeFee0 = await contract0.getBridgeFee(
      ethers.utils.parseUnits("1", 18)
    );
    const bridgeFee1 = await contract1.getBridgeFee(
      ethers.utils.parseUnits("1", 18)
    );
    const parsedFee0 = ethers.utils.formatEther(bridgeFee0);
    const parsedFee1 = ethers.utils.formatEther(bridgeFee1);
    const total0 = 1 + Number(parsedFee0);
    const total1 = 1 + Number(parsedFee1);
    for (let i = 0; i < signers.length; i++) {
      const MyContract0 = new ethers.Contract(
        ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
        bridge_abi,
        signers[i]
      );
      const MyContract1 = new ethers.Contract(
        WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
        bridge_abi,
        signers[i]
      );
      //   const WETH_CONTRACT = new ethers.Contract(
      //     WETH_ADDRESS_WORLDLAND,
      //     weth_abi,
      //     signers[i]
      //   );
      //   const approve = WETH_CONTRACT.approve(
      //     WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
      //     ethers.utils.parseUnits("1000000", 18)
      //   );
      const tx0 = MyContract0.lockETH(
        signers[i],
        WETH_ADDRESS_ETHEREUM,
        bridgeFee0,
        {
          value: ethers.utils.parseUnits(total0.toString(), 18),
        }
      );
      const tx1 = MyContract1.lockETH(
        signers[i],
        WETH_ADDRESS_WORLDLAND,
        bridgeFee1,
        {
          value: ethers.utils.parseUnits(total1.toString(), 18),
        }
      );
      //   rawTxArr.push(approve);
      rawTxArr.push(tx0);
      rawTxArr.push(tx1);
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
