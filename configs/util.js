const { ethers } = require("hardhat");
const { PROCESSED, gasLimit } = require("./constants");
const { TABLES } = require("../db/tables");
const { MESSAGES } = require("./messages");
const { move } = require("../db/queries");
const { sendMessage } = require("./telegram_bot");
require("dotenv").config();

const message_type = ["address", "uint256", "uint256", "address"];

const map_token_address_to_token_address = {
  [process.env.TOKEN_ADDRESS_ETHEREUM]: process.env.TOKEN_ADDRESS_WORLDLAND,
  [process.env.TOKEN_ADDRESS_WORLDLAND]: process.env.TOKEN_ADDRESS_ETHEREUM,
  [process.env.WETH_ADDRESS_ETHEREUM]: process.env.WETH_ADDRESS_WORLDLAND,
  [process.env.WETH_ADDRESS_WORLDLAND]: process.env.WETH_ADDRESS_ETHEREUM,
};

async function createSignature(types, messages, wallet) {
  const hash = ethers.utils.solidityKeccak256(types, messages);
  return await wallet.signMessage(ethers.utils.arrayify(hash));
}

function convertBigNumToString(bigNum) {
  return ethers.BigNumber.from(bigNum).toString();
}

function formatAddress(address) {
  return [address.slice(0, 9), "...", address.slice(-7)].join("");
}

async function consumeTx(args) {
  try {
    let { queue, contract, wallet, method } = args;
    // batch submission
    if (queue.length > 0) {
      let destinations = [];
      let amounts = [];
      let nonces = [];
      let tokens = [];
      for (let i = 0; i < queue.length; i++) {
        if (!queue[i].processed) {
          let { to_address, amount, nonce, token } = queue[i];
          destinations.push(to_address);
          amounts.push(amount);
          nonces.push(nonce);
          tokens.push(token);
        }
      }
      const admin_signature = await createSignature(
        message_type,
        [destinations[0], amounts[0], nonces[0], tokens[0]],
        wallet
      );
      contract
        .connect(wallet)
        [method](destinations, amounts, nonces, tokens, admin_signature)
        .then((tx) => {
          for (let i = 0; i < queue.length; i++) {
            let {
              id,
              from_address,
              to_address,
              amount,
              nonce,
              token,
              timestamp,
              chain,
              processed,
              function_type,
            } = queue[i];
            processed = PROCESSED.TRUE;
            move(
              TABLES.TX_QUEUE,
              TABLES.TX_PROCESSED,
              [
                from_address,
                to_address,
                amount,
                nonce,
                token,
                timestamp,
                chain,
                processed,
                function_type,
              ],
              id
            );
          }
          sendMessage(`
          ${MESSAGES.BATCH_PROCESSED(
            queue[0].chain,
            destinations.length
          )} Transaction Hash: ${tx.hash}`);
          console.log({ txHash: tx.hash });
          console.log(
            MESSAGES.BATCH_PROCESSED(queue[0].chain, destinations.length)
          );
        })
        .catch((err) => {
          for (let i = 0; i < queue.length; i++) {
            let {
              id,
              from_address,
              to_address,
              amount,
              nonce,
              token,
              timestamp,
              chain,
              processed,
              function_type,
            } = queue[i];
            processed = PROCESSED.FALSE;
            move(
              TABLES.TX_QUEUE,
              TABLES.TX_FAILED,
              [
                from_address,
                to_address,
                amount,
                nonce,
                token,
                timestamp,
                chain,
                processed,
                function_type,
              ],
              id
            );
          }
          sendMessage(MESSAGES.TX_FAILED(queue[0].chain));
          console.log(MESSAGES.TX_FAILED(queue[0].chain));
          console.log(err);
        });
    }
  } catch (err) {
    console.error(err);
  }
}

module.exports = {
  map_token_address_to_token_address,
  message_type,
  createSignature,
  convertBigNumToString,
  consumeTx,
  formatAddress,
};
