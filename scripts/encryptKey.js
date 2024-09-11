require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs-extra");
const path = require("path");

async function main() {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  const encryptedKey = await wallet.encrypt(
    process.env.PRIVATE_KEY_PW,
    process.env.PRIVATE_KEY
  );
  const resolvePath = path.resolve(__dirname, "../.encryptedKey.json");
  fs.writeFileSync(resolvePath, encryptedKey);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
