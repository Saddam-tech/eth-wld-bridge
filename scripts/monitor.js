const { ethers } = require("hardhat");
const fs = require("fs-extra");
require("dotenv").config();

const {
  abi: BRIDGE_ABI,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const {
  map_token_address_to_token_address,
  createSignature,
  message_type,
  convertBigNumToString,
  consumeTx,
} = require("../configs/util");
const {
  gasLimit,
  txProcessInterval,
  CHAINS,
  PROCESSED,
  FUNCTIONS,
} = require("../configs/constants");
const { MESSAGES } = require("../configs/messages");
const { EVENTS } = require("../configs/events");
const { insert, query_all, move } = require("../db/queries");
const { TABLES } = require("../db/tables");

const encryptedJson = fs.readFileSync("./.encryptedKey.json", "utf8");
const encryptedPk = new ethers.Wallet.fromEncryptedJsonSync(
  encryptedJson,
  process.env.PRIVATE_KEY_PW
);

const CHAIN_1_BRIDGE_ADDRESS = process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;
const CHAIN_2_BRIDGE_ADDRESS = process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
const CHAIN_1_PROVIDER = new ethers.providers.JsonRpcProvider(
  process.env.provider_chain_1
);
const CHAIN_2_PROVIDER = new ethers.providers.JsonRpcProvider(
  process.env.provider_chain_2
);
const CHAIN_1_CONTRACT = new ethers.Contract(
  CHAIN_1_BRIDGE_ADDRESS,
  BRIDGE_ABI,
  CHAIN_1_PROVIDER,
  { gasLimit }
);
const CHAIN_2_CONTRACT = new ethers.Contract(
  CHAIN_2_BRIDGE_ADDRESS,
  BRIDGE_ABI,
  CHAIN_2_PROVIDER,
  { gasLimit }
);
const WALLET_CHAIN_1 = new ethers.Wallet(encryptedPk, CHAIN_1_PROVIDER);
const WALLET_CHAIN_2 = new ethers.Wallet(encryptedPk, CHAIN_2_PROVIDER);

async function processTransactionQueue() {
  try {
    // ETH => WETH
    let mintWETHTxQueueChain1 = [];
    let mintWETHTxQueueChain2 = [];
    let unLockETHTxQueueChain1 = [];
    let unLockETHTxQueueChain2 = [];

    // Token => Token
    let mintTokenTxQueueChain1 = [];
    let mintTokenTxQueueChain2 = [];
    let unlockTokenTxQueueChain1 = [];
    let unlockTokenTxQueueChain2 = [];

    const tx_queue = await query_all(TABLES.TX_QUEUE);
    console.log({ tx_queue });
    if (tx_queue.length > 0) {
      for (let i = 0; i < tx_queue.length; i++) {
        if (tx_queue[i].processed === PROCESSED.FALSE) {
          // processed transactions will not exist in tx_queue table, but it does not hurt to make an extra check here
          // continue if the transaction is not processed yet
          // start sorting the transactions

          // saving into MINTWETH temporary memory
          if (
            tx_queue[i].chain === CHAINS.CHAIN_1 &&
            tx_queue[i].function_type === FUNCTIONS.MINTWETH
          ) {
            // save into chain1 MINTWETH temporary memory
            mintWETHTxQueueChain1.push(tx_queue[i]);
          }
          if (
            tx_queue[i].chain === CHAINS.CHAIN_2 &&
            tx_queue[i].function_type === FUNCTIONS.MINTWETH
          ) {
            // save into chain2 MINTWETH temporary memory
            mintWETHTxQueueChain2.push(tx_queue[i]);
          }

          // save into UNLOCKETH temporary memory
          if (
            tx_queue[i].chain === CHAINS.CHAIN_1 &&
            tx_queue[i].function_type === FUNCTIONS.UNLOCKETH
          ) {
            // save into chain1 UNLOCKETH temporary memory
            unLockETHTxQueueChain1.push(tx_queue[i]);
          }
          if (
            tx_queue[i].chain === CHAINS.CHAIN_2 &&
            tx_queue[i].function_type === FUNCTIONS.UNLOCKETH
          ) {
            // save into chain2 UNLOCKETH temporary memory
            unLockETHTxQueueChain2.push(tx_queue[i]);
          }

          // save into MINTTOKEN temporary memory
          if (
            tx_queue[i].chain === CHAINS.CHAIN_1 &&
            tx_queue[i].function_type === FUNCTIONS.MINTTOKEN
          ) {
            // save into chain1 MINTTOKEN temporary memory
            mintTokenTxQueueChain1.push(tx_queue[i]);
          }
          if (
            tx_queue[i].chain === CHAINS.CHAIN_2 &&
            tx_queue[i].function_type === FUNCTIONS.MINTTOKEN
          ) {
            // save into chain2 MINTTOKEN temporary memory
            mintTokenTxQueueChain2.push(tx_queue[i]);
          }

          // save into UNLOCKTOKEN temporary memory
          if (
            tx_queue[i].chain === CHAINS.CHAIN_1 &&
            tx_queue[i].function_type === FUNCTIONS.UNLOCKTOKEN
          ) {
            // save into chain1 UNLOCKTOKEN temporary memory
            unlockTokenTxQueueChain1.push(tx_queue[i]);
          }
          if (
            tx_queue[i].chain === CHAINS.CHAIN_2 &&
            tx_queue[i].function_type === FUNCTIONS.UNLOCKTOKEN
          ) {
            // save into chain2 UNLOCKTOKEN temporary memory
            unlockTokenTxQueueChain2.push(tx_queue[i]);
          }
        }
      }
    }

    // chain1 mintWETH batch submission
    if (mintWETHTxQueueChain1.length > 0) {
      consumeTx({
        queue: mintWETHTxQueueChain1,
        contract: CHAIN_1_CONTRACT,
        wallet: WALLET_CHAIN_1,
        method: mintWETHTxQueueChain1[0].function_type,
      });
    } else {
      console.log(MESSAGES.NO_TX(1));
    }

    // chain2 mintWETH batch submission
    if (mintWETHTxQueueChain2.length > 0) {
      consumeTx({
        queue: mintWETHTxQueueChain2,
        contract: CHAIN_2_CONTRACT,
        wallet: WALLET_CHAIN_2,
        method: mintWETHTxQueueChain2[0].function_type,
      });
    } else {
      console.log(MESSAGES.NO_TX(2));
    }

    // chain1 unLockETH batch submission
    if (unLockETHTxQueueChain1.length > 0) {
      consumeTx({
        queue: unLockETHTxQueueChain1,
        contract: CHAIN_1_CONTRACT,
        wallet: WALLET_CHAIN_1,
        method: unLockETHTxQueueChain1[0].function_type,
      });
    } else {
      console.log(MESSAGES.NO_TX(1));
    }

    // chain2 unLockETH batch submission
    if (unLockETHTxQueueChain2.length > 0) {
      consumeTx({
        queue: unLockETHTxQueueChain2,
        contract: CHAIN_2_CONTRACT,
        wallet: WALLET_CHAIN_2,
        method: unLockETHTxQueueChain2[0].function_type,
      });
    } else {
      console.log(MESSAGES.NO_TX(2));
    }

    // chain1 mintToken batch submission
    if (mintTokenTxQueueChain1.length > 0) {
      consumeTx({
        queue: mintTokenTxQueueChain1,
        contract: CHAIN_1_CONTRACT,
        wallet: WALLET_CHAIN_1,
        method: mintTokenTxQueueChain1[0].function_type,
      });
    } else {
      console.log(MESSAGES.NO_TX(1));
    }

    // chain2 mintToken batch submission
    if (mintTokenTxQueueChain2.length > 0) {
      consumeTx({
        queue: mintTokenTxQueueChain2,
        contract: CHAIN_2_CONTRACT,
        wallet: WALLET_CHAIN_2,
        method: mintTokenTxQueueChain2[0].function_type,
      });
    } else {
      console.log(MESSAGES.NO_TX(2));
    }

    // chain1 unlockToken batch submission
    if (unlockTokenTxQueueChain1.length > 0) {
      consumeTx({
        queue: unlockTokenTxQueueChain1,
        contract: CHAIN_1_CONTRACT,
        wallet: WALLET_CHAIN_1,
        method: unlockTokenTxQueueChain1[0].function_type,
      });
    } else {
      console.log(MESSAGES.NO_TX(1));
    }

    // chain2 unlockToken batch submission
    if (unlockTokenTxQueueChain2.length > 0) {
      consumeTx({
        queue: unlockTokenTxQueueChain2,
        contract: CHAIN_2_CONTRACT,
        wallet: WALLET_CHAIN_2,
        method: unlockTokenTxQueueChain2[0].function_type,
      });
    } else {
      console.log(MESSAGES.NO_TX(2));
    }
  } catch (err) {
    console.log(err);
  }
}

async function monitorLockEvents() {
  console.log(MESSAGES.INIT);
  // Listen for LockToken event on CHAIN_1_CONTRACT
  CHAIN_1_CONTRACT.on(
    EVENTS.LOCKTOKEN,
    async (from, to, amount, token, timestamp, tokenType, nonce) => {
      console.log(MESSAGES.TOKEN_TRANSFER(1));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("token_name: ", tokenType);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      insert(TABLES.TX_QUEUE, [
        from,
        to,
        convertedAmount,
        convertedNonce,
        otherChainToken,
        convertedTimestamp,
        CHAINS.CHAIN_2,
        PROCESSED.FALSE,
        FUNCTIONS.MINTTOKEN,
      ]);
    }
  );

  // Listen for LockToken event on CHAIN_2_CONTRACT
  CHAIN_2_CONTRACT.on(
    EVENTS.LOCKTOKEN,
    async (from, to, amount, token, timestamp, tokenType, nonce) => {
      console.log(MESSAGES.TOKEN_TRANSFER(2));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("token_name: ", tokenType);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      insert(TABLES.TX_QUEUE, [
        from,
        to,
        convertedAmount,
        convertedNonce,
        otherChainToken,
        convertedTimestamp,
        CHAINS.CHAIN_2,
        PROCESSED.FALSE,
        FUNCTIONS.MINTTOKEN,
      ]);
    }
  );

  // Listen for BurnToken event on CHAIN_1_CONTRACT
  CHAIN_1_CONTRACT.on(
    EVENTS.BURNTOKEN,
    async (from, to, amount, token, timestamp, tokenType, nonce) => {
      console.log(MESSAGES.TOKEN_TRANSFER(1));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("token_name: ", tokenType);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      insert(TABLES.TX_QUEUE, [
        from,
        to,
        convertedAmount,
        convertedNonce,
        otherChainToken,
        convertedTimestamp,
        CHAINS.CHAIN_2,
        PROCESSED.FALSE,
        FUNCTIONS.UNLOCKTOKEN,
      ]);
    }
  );

  // Listen for BurnToken event on CHAIN_2_CONTRACT
  CHAIN_2_CONTRACT.on(
    EVENTS.BURNTOKEN,
    async (from, to, amount, token, timestamp, tokenType, nonce) => {
      console.log(MESSAGES.TOKEN_TRANSFER(2));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("token_name: ", tokenType);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      insert(TABLES.TX_QUEUE, [
        from,
        to,
        convertedAmount,
        convertedNonce,
        otherChainToken,
        convertedTimestamp,
        CHAINS.CHAIN_1,
        PROCESSED.FALSE,
        FUNCTIONS.UNLOCKTOKEN,
      ]);
    }
  );

  // BRIDGING WETH

  // Listen for the (LockETH) event on the CHAIN_1_CONTRACT
  CHAIN_1_CONTRACT.on(
    EVENTS.LOCK_ETH,
    async (from, to, amount, token, timestamp, nonce) => {
      console.log(MESSAGES.ETH_TRANSFER(1));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      insert(TABLES.TX_QUEUE, [
        from,
        to,
        convertedAmount,
        convertedNonce,
        otherChainToken,
        convertedTimestamp,
        CHAINS.CHAIN_2,
        PROCESSED.FALSE,
        FUNCTIONS.MINTWETH,
      ]);
    }
  );
  // Listen for (LockETH) event on CHAIN_2_CONTRACT
  CHAIN_2_CONTRACT.on(
    EVENTS.LOCK_ETH,
    async (from, to, amount, token, timestamp, nonce) => {
      console.log(MESSAGES.ETH_TRANSFER(2));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      insert(TABLES.TX_QUEUE, [
        from,
        to,
        convertedAmount,
        convertedNonce,
        otherChainToken,
        convertedTimestamp,
        CHAINS.CHAIN_1,
        PROCESSED.FALSE,
        FUNCTIONS.MINTWETH,
      ]);
    }
  );

  // Listen for (BurnWETH) event on CHAIN_1_CONTRACT
  CHAIN_1_CONTRACT.on(
    EVENTS.BURN_WETH,
    async (from, to, amount, token, timestamp, nonce) => {
      console.log(MESSAGES.BURN(1));
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      insert(TABLES.TX_QUEUE, [
        from,
        to,
        convertedAmount,
        convertedNonce,
        otherChainToken,
        convertedTimestamp,
        CHAINS.CHAIN_2,
        PROCESSED.FALSE,
        FUNCTIONS.BURN_WETH,
      ]);
    }
  );

  // Listen for (BurnWETH) event on CHAIN_2_CONTRACT
  CHAIN_2_CONTRACT.on(
    EVENTS.BURN_WETH,
    async (from, to, amount, token, timestamp, nonce) => {
      console.log(MESSAGES.BURN(2));
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      insert(TABLES.TX_QUEUE, [
        from,
        to,
        convertedAmount,
        convertedNonce,
        otherChainToken,
        convertedTimestamp,
        CHAINS.CHAIN_1,
        PROCESSED.FALSE,
        FUNCTIONS.UNLOCKETH,
      ]);
    }
  );

  // Process tx queue in batch every 15 secs
  setInterval(async () => {
    await processTransactionQueue();
  }, txProcessInterval);
}

monitorLockEvents().catch((err) => {
  console.log(err);
  process.exit(1);
});
