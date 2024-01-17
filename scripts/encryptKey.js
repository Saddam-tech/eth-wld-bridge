const { ethers } = require("hardhat");
const fs = require("fs-extra");
require("dotenv").config();

async function main() {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  const encryptedKey = await wallet.encrypt(
    process.env.PRIVATE_KEY_PW,
    process.env.PRIVATE_KEY
  );
  console.log({ encryptedKey });
  fs.writeFileSync("../.encryptedKey.json", encryptedKey);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
