const { ethers } = require("hardhat");
const { PROCESSED, gasLimit } = require("./constants");
const { TABLES } = require("../db/tables");
const { MESSAGES } = require("./messages");
const { deleteRow } = require("../db/queries");
const { sendMessage } = require("./telegram_bot");
const db = require("../db/mariadb/models");
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
        .then(async (tx) => {
          let rawPromises = [];
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
            rawPromises[i] = db["tx_processed"].create({
              id,
              from_address,
              to_address,
              amount,
              token,
              timestamp,
              nonce,
              processed,
              chain,
              function_type,
              tx_hash: tx.hash,
            });
            deleteRow(TABLES.TX_QUEUE, id); // deleting row from sqlite tx_queue table
          }
          await Promise.all(rawPromises);
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
        .catch(async (err) => {
          let rawPromises = [];
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
            deleteRow(TABLES.TX_QUEUE, id); // deleting row from sqlite tx_queue table
            rawPromises[i] = db[TABLES.TX_FAILED].create({
              // recreating row inside mariadb tx_failed table
              id,
              from_address,
              to_address,
              amount,
              token,
              timestamp,
              nonce,
              processed,
              chain,
              function_type,
            });
          }
          await Promise.all(rawPromises);
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
