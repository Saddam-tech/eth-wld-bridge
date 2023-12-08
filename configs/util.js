const { ethers } = require("hardhat");
require("dotenv").config();

const message_type = ["address"];

const map_token_address_to_token_address = {
  [process.env.TOKEN_ADDRESS_ETHEREUM]: process.env.TOKEN_ADDRESS_WORLDLAND,
  [process.env.TOKEN_ADDRESS_WORLDLAND]: process.env.TOKEN_ADDRESS_ETHEREUM,
  [process.env.WETH_ADDRESS_ETHEREUM]: process.env.WETH_ADDRESS_WORLDLAND,
  [process.env.WETH_ADDRESS_WORLDLAND]: process.env.WETH_ADDRESS_ETHEREUM,
};

async function createSignature(types, messages) {
  const hash = ethers.utils.solidityKeccak256(types, messages);
  const signer = await ethers.getSigner();
  return signer.signMessage(ethers.utils.arrayify(hash));
}
// }

module.exports = {
  map_token_address_to_token_address,
  message_type,
  createSignature,
};
