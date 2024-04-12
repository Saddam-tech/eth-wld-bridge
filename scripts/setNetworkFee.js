const { ethers } = require("hardhat");
require("dotenv").config();
const fs = require("fs-extra");
const {
  abi: bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const { gasLimit, CHAIN_IDS } = require("../configs/constants");
const { getParameterFromAWS } = require("../configs/vaultAccess");
const path = require("path");
const resolvePath = path.resolve(__dirname, "../.encryptedKey.json");
const encryptedJson = fs.readFileSync(resolvePath, "utf8");
const cron = require("node-cron");
const db = require("../db/mariadb/models");
const { TABLES } = require("../db/tables");

async function feeSetter() {
  try {
    const WORLDLAND_BRIDGE_CONTRACT_ADDRESS =
      process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
    const provider1 = new ethers.providers.JsonRpcProvider(
      process.env.provider_chain_1
    );
    const provider2 = new ethers.providers.JsonRpcProvider(
      process.env.provider_chain_2
    );
    const contract = new ethers.Contract(
      WORLDLAND_BRIDGE_CONTRACT_ADDRESS,
      bridge_abi,
      provider2,
      { gasLimit }
    );

    // const pk_pw = await getParameterFromAWS();
    const pk_pw = process.env.PRIVATE_KEY_PW;
    const decodedpk = new ethers.Wallet.fromEncryptedJsonSync(
      encryptedJson,
      pk_pw
    );
    const signer = new ethers.Wallet(decodedpk, provider2); // sets the fee on rpc provider 2 (Worldland)

    let gasPrice = ethers.utils.formatEther(await provider1.getGasPrice()); // ethereum gas price
    const contractUnitCount = process.env.CONTRACT_UNITCOUNT.toString();
    console.log({ gasPrice });

    let bnGasPrice = ethers.utils.parseUnits(gasPrice.toString(), "ether");
    let bnContractUnitCount = ethers.BigNumber.from(contractUnitCount);
    let bnNetworkFee = bnGasPrice.mul(bnContractUnitCount);

    const tx = await contract
      .connect(signer)
      .setNetworkFee(
        process.env.NETWORKFEE_ID_CHAIN2,
        process.env.NETWORKFEE_CONTRACT_ADDRESS_CHAIN2,
        process.env.NETWORKFEE_FEETYPE_CHAIN2,
        bnNetworkFee
      );
    const networkFeeRate = await contract.networkFeeRate();
    const _networkFee = await contract.networkFee();
    await db[TABLES.FEE_ARCHIVE].create({
      chain_id: CHAIN_IDS.C2,
      fee_rate: ethers.utils.formatEther(networkFeeRate),
      gasPrice: ethers.utils.formatEther(await provider1.getGasPrice()),
      networkFee: ethers.utils.formatEther(Object.values(_networkFee)[3]),
      contractUnitCount: contractUnitCount,
      signer: signer.address,
      contract_address: Object.values(_networkFee)[1],
    });
    console.log({ tx });
    console.log(
      "Network fee has been set: ",
      ethers.utils.formatEther(Object.values(_networkFee)[3])
    );
  } catch (err) {
    if (err) {
      console.log(err);
    }
  }
}

// feeSetter();

cron.schedule(`1 */23 * * *`, async () =>
  feeSetter()
    .then()
    .catch((err) => {
      console.log(err);
      process.exit(1);
    })
);
