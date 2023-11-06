const { ethers } = require("hardhat");
require("dotenv").config();
const map_token_address_to_token_address = {
  [process.env.TOKEN_ADDRESS_ETHEREUM]: [process.env.TOKEN_ADDRESS_WORLDLAND],
  [process.env.TOKEN_ADDRESS_WORLDLAND]: [process.env.TOKEN_ADDRESS_ETHEREUM],
};

async function createSignature(message) {
  const signer = (await ethers.getSigners())[0];
  return signer?.signMessage(message);
}

module.exports = { map_token_address_to_token_address, createSignature };
