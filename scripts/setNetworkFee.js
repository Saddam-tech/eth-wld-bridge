const { ethers } = require("hardhat");
require("dotenv").config();
const fs = require("fs-extra");
const {
  abi: bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const { gasLimit } = require("../configs/constants");
const { getParameterFromAWS } = require("../configs/vaultAccess");
const encryptedJson = fs.readFileSync("../.encryptedKey.json", "utf8");
const cron = require("node-cron");

async function main() {
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
  // const signer = new ethers.Wallet(decodedpk, provider2); // sets the fee on rpc provider 2 (Worldland)
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider2); // sets the fee on rpc provider 2 (Worldland)

  let gasPrice = ethers.utils.formatEther(await provider1.getGasPrice()); // ethereum gas price
  console.log({ gasPrice });
  gasPrice = Number(gasPrice);
  const contractUnitCount = parseFloat(process.env.CONTRACT_UNITCOUNT);
  let networkFee = (gasPrice * contractUnitCount).toString();
  const parsed = ethers.utils.parseEther(networkFee);
  console.log({ networkFee });
  const tx = await contract
    .connect(signer)
    .setNetworkFee(
      process.env.NETWORKFEE_ID,
      process.env.NETWORKFEE_CONTRACT_ADDRESS,
      process.env.NETWORKFEE_FEETYPE,
      parsed
    );

  console.log({ tx });
}

main();

// cron.schedule(`* */23 * * *`, async () =>
//   main()
//     .then()
//     .catch((err) => {
//       console.log(err);
//       process.exit(1);
//     })
// );
