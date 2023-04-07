require("dotenv").config();
const map_chain_1_tokenAddr_to_chain_2_tokenAddr = {
  [process.env.TANGA_TOKEN_ADDRESS_ETHEREUM]: [
    process.env.TANGA_TOKEN_ADDRESS_POLYGON,
  ],
};
const map_chain_2_tokenAddr_to_chain_1_tokenAddr = {
  [process.env.TANGA_TOKEN_ADDRESS_POLYGON]: [
    process.env.TANGA_TOKEN_ADDRESS_ETHEREUM,
  ],
};

module.exports = {
  map_chain_1_tokenAddr_to_chain_2_tokenAddr,
  map_chain_2_tokenAddr_to_chain_1_tokenAddr,
};
