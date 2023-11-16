// const encryptedJson = fs.readFileSync("./.encryptedKey.json", "utf8");
// const encryptedPk = new ethers.Wallet.fromEncryptedJsonSync(
//   encryptedJson,
//   process.env.PRIVATE_KEY_PW
// );

const gasLimit = 100000;
const txProcessInterval = 15000;

module.exports = {
  gasLimit,
  txProcessInterval,
};
