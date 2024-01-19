// const encryptedJson = fs.readFileSync("./.encryptedKey.json", "utf8");
// const encryptedPk = new ethers.Wallet.fromEncryptedJsonSync(
//   encryptedJson,
//   process.env.PRIVATE_KEY_PW
// );

const gasLimit = 1000000;
const txProcessInterval = 15000;

const CHAINS = {
  CHAIN_1: 1,
  CHAIN_2: 2,
};

const PROCESSED = {
  FALSE: 0,
  TRUE: 1,
};

const FUNCTIONS = {
  MINTWETH: "mintWETH",
  MINTTOKEN: "mintToken",
  UNLOCKTOKEN: "unlockToken",
  UNLOCKETH: "unlockETH",
};

module.exports = {
  gasLimit,
  txProcessInterval,
  CHAINS,
  PROCESSED,
  FUNCTIONS,
};
