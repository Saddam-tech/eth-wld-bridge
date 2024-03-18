const { ethers } = require("hardhat");
const fs = require("fs-extra");
require("dotenv").config();

const {
  abi: BRIDGE_ABI,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const {
  map_token_address_to_token_address,
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
const { insert, query_all, move, query_params } = require("../db/queries");
const { TABLES } = require("../db/tables");
const { sendMessage } = require("../configs/telegram_bot");
const { getParameterFromAWS } = require("./vaultAccess");

const encryptedJson = fs.readFileSync("./.encryptedKey.json", "utf8");

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

let PRIVATE_KEY_PW = "";

async function processTransactionQueue() {
  try {
    let queue_chain_1 = [];
    let queue_chain_2 = [];

    const tx_queue = await query_all(TABLES.TX_QUEUE);
    console.log({ tx_queue });
    if (tx_queue.length > 0) {
      if (!PRIVATE_KEY_PW) {
        // PRIVATE_KEY_PW = await getParameterFromAWS();
        PRIVATE_KEY_PW = process.env.PRIVATE_KEY_PW;
      }
      for (let i = 0; i < tx_queue.length; i++) {
        if (tx_queue[i].processed === PROCESSED.FALSE) {
          // processed transactions will not exist in tx_queue table, but it does not hurt to make an extra check here
          // continue if the transaction is not processed yet
          // start sorting the transactions
          if (tx_queue[i].chain === CHAINS.CHAIN_1) {
            // saving into chain_1 queue temporary memory
            queue_chain_1.push(tx_queue[i]);
          }
          if (tx_queue[i].chain === CHAINS.CHAIN_2) {
            // saving into chain_2 queue temporary memory
            queue_chain_2.push(tx_queue[i]);
          }
        }
      }
    }

    // chain 1 queue batch submission
    if (queue_chain_1.length > 0) {
      const encryptedPk = new ethers.Wallet.fromEncryptedJsonSync(
        encryptedJson,
        PRIVATE_KEY_PW
      );
      const WALLET_CHAIN_1 = new ethers.Wallet(encryptedPk, CHAIN_1_PROVIDER);
      consumeTx({
        queue: queue_chain_1,
        contract: CHAIN_1_CONTRACT,
        wallet: WALLET_CHAIN_1,
        method: queue_chain_1[0].function_type,
      });
    } else {
      console.log(MESSAGES.NO_TX(1));
    }

    // chain2 queue batch submission
    if (queue_chain_2.length > 0) {
      const encryptedPk = new ethers.Wallet.fromEncryptedJsonSync(
        encryptedJson,
        PRIVATE_KEY_PW
      );
      const WALLET_CHAIN_2 = new ethers.Wallet(encryptedPk, CHAIN_2_PROVIDER);
      consumeTx({
        queue: queue_chain_2,
        contract: CHAIN_2_CONTRACT,
        wallet: WALLET_CHAIN_2,
        method: queue_chain_2[0].function_type,
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
    async (
      from,
      to,
      bridgeFee,
      amount,
      token,
      timestamp,
      nonce,
      networkFeeContractAddress,
      networkFee
    ) => {
      console.log(MESSAGES.TOKEN_TRANSFER(1));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
      console.log("networkFee: ", ethers.utils.formatEther(networkFee));
      console.log("networkFee_contract_address: ", networkFeeContractAddress);
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      let alreadyQueuedTxs = await query_params(
        TABLES.TX_QUEUE,
        "nonce",
        convertedNonce
      );
      if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        sendMessage(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      if (alreadyQueuedTxs.length > 0) {
        console.log(MESSAGES.ALREADY_QUEUED);
        sendMessage(MESSAGES.ALREADY_QUEUED);
        return;
      }
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
      // Sending notification to telegram bot
      sendMessage(`
        ${MESSAGES.TOKEN_TRANSFER(1)}
        from: ${from}
        to: ${to}
        amount: ${ethers.utils.formatEther(convertedAmount)}
        bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
        network_fee: ${ethers.utils.formatEther(networkFee)}
        token_chain_1: ${token}
        token_chain_2: ${otherChainToken}
        timestamp: ${convertedTimestamp}
        nonce: ${convertedNonce}
        `);
    }
  );

  // Listen for LockToken event on CHAIN_2_CONTRACT
  CHAIN_2_CONTRACT.on(
    EVENTS.LOCKTOKEN,
    async (
      from,
      to,
      bridgeFee,
      amount,
      token,
      timestamp,
      nonce,
      networkFeeContractAddress,
      networkFee
    ) => {
      console.log(MESSAGES.TOKEN_TRANSFER(2));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
      console.log("networkFee: ", ethers.utils.formatEther(networkFee));
      console.log("networkFee_contract_address: ", networkFeeContractAddress);
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      let alreadyQueuedTxs = await query_params(
        TABLES.TX_QUEUE,
        "nonce",
        convertedNonce
      );
      if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        sendMessage(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      if (alreadyQueuedTxs.length > 0) {
        console.log(MESSAGES.ALREADY_QUEUED);
        sendMessage(MESSAGES.ALREADY_QUEUED);
        return;
      }
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
      // Sending notification to telegram bot
      sendMessage(`
        ${MESSAGES.TOKEN_TRANSFER(2)}
        from: ${from}
        to: ${to}
        amount: ${ethers.utils.formatEther(convertedAmount)}
        bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
        network_fee: ${ethers.utils.formatEther(networkFee)}
        token_chain_1: ${token}
        token_chain_2: ${otherChainToken}
        timestamp: ${convertedTimestamp}
        nonce: ${convertedNonce}
        `);
    }
  );

  // Listen for BurnToken event on CHAIN_1_CONTRACT
  CHAIN_1_CONTRACT.on(
    EVENTS.BURNTOKEN,
    async (
      from,
      to,
      bridgeFee,
      amount,
      token,
      timestamp,
      nonce,
      networkFeeContractAddress,
      networkFee
    ) => {
      console.log(MESSAGES.TOKEN_TRANSFER(1));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
      console.log("networkFee: ", ethers.utils.formatEther(networkFee));
      console.log("networkFee_contract_address: ", networkFeeContractAddress);
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      let alreadyQueuedTxs = await query_params(
        TABLES.TX_QUEUE,
        "nonce",
        convertedNonce
      );
      if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        sendMessage(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      if (alreadyQueuedTxs.length > 0) {
        console.log(MESSAGES.ALREADY_QUEUED);
        sendMessage(MESSAGES.ALREADY_QUEUED);
        return;
      }
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
      // Sending notification to telegram bot
      sendMessage(`
       ${MESSAGES.TOKEN_TRANSFER(1)}
       from: ${from}
       to: ${to}
       amount: ${ethers.utils.formatEther(convertedAmount)}
       bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
       network_fee: ${ethers.utils.formatEther(networkFee)}
       token_chain_1: ${token}
       token_chain_2: ${otherChainToken}
       timestamp: ${convertedTimestamp}
       nonce: ${convertedNonce}
       `);
    }
  );

  // Listen for BurnToken event on CHAIN_2_CONTRACT
  CHAIN_2_CONTRACT.on(
    EVENTS.BURNTOKEN,
    async (
      from,
      to,
      bridgeFee,
      amount,
      token,
      timestamp,
      nonce,
      networkFeeContractAddress,
      networkFee
    ) => {
      console.log(MESSAGES.TOKEN_TRANSFER(2));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
      console.log("networkFee: ", ethers.utils.formatEther(networkFee));
      console.log("networkFee_contract_address: ", networkFeeContractAddress);
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      let alreadyQueuedTxs = await query_params(
        TABLES.TX_QUEUE,
        "nonce",
        convertedNonce
      );
      if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        sendMessage(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      if (alreadyQueuedTxs.length > 0) {
        console.log(MESSAGES.ALREADY_QUEUED);
        sendMessage(MESSAGES.ALREADY_QUEUED);
        return;
      }
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
      // Sending notification to telegram bot
      sendMessage(`
         ${MESSAGES.TOKEN_TRANSFER(2)}
         from: ${from}
         to: ${to}
         amount: ${ethers.utils.formatEther(convertedAmount)}
         bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
         network_fee: ${ethers.utils.formatEther(networkFee)}
         token_chain_1: ${token}
         token_chain_2: ${otherChainToken}
         timestamp: ${convertedTimestamp}
         nonce: ${convertedNonce}
         `);
    }
  );

  // BRIDGING WETH

  // Listen for the (LockETH) event on the CHAIN_1_CONTRACT
  CHAIN_1_CONTRACT.on(
    EVENTS.LOCK_ETH,
    async (
      from,
      to,
      bridgeFee,
      amount,
      token,
      timestamp,
      nonce,
      networkFeeContractAddress,
      networkFee
    ) => {
      console.log(MESSAGES.ETH_TRANSFER(1));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
      console.log("networkFee: ", ethers.utils.formatEther(networkFee));
      console.log("networkFee_contract_address: ", networkFeeContractAddress);
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      let alreadyQueuedTxs = await query_params(
        TABLES.TX_QUEUE,
        "nonce",
        convertedNonce
      );
      if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        sendMessage(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      if (alreadyQueuedTxs.length > 0) {
        console.log(MESSAGES.ALREADY_QUEUED);
        sendMessage(MESSAGES.ALREADY_QUEUED);
        return;
      }
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
      // Sending notification to telegram bot
      sendMessage(`
       ${MESSAGES.ETH_TRANSFER(1)}
       from: ${from}
       to: ${to}
       amount: ${ethers.utils.formatEther(convertedAmount)}
       bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
       network_fee: ${ethers.utils.formatEther(networkFee)}
       token_chain_1: ${token}
       token_chain_2: ${otherChainToken}
       timestamp: ${convertedTimestamp}
       nonce: ${convertedNonce}
       `);
    }
  );
  // Listen for (LockETH) event on CHAIN_2_CONTRACT
  CHAIN_2_CONTRACT.on(
    EVENTS.LOCK_ETH,
    async (
      from,
      to,
      bridgeFee,
      amount,
      token,
      timestamp,
      nonce,
      networkFeeContractAddress,
      networkFee
    ) => {
      console.log(MESSAGES.ETH_TRANSFER(2));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
      console.log("networkFee: ", ethers.utils.formatEther(networkFee));
      console.log("networkFee_contract_address: ", networkFeeContractAddress);
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      let alreadyQueuedTxs = await query_params(
        TABLES.TX_QUEUE,
        "nonce",
        convertedNonce
      );
      if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        sendMessage(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      if (alreadyQueuedTxs.length > 0) {
        console.log(MESSAGES.ALREADY_QUEUED);
        sendMessage(MESSAGES.ALREADY_QUEUED);
        return;
      }
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
      // Sending notification to telegram bot
      sendMessage(`
        ${MESSAGES.ETH_TRANSFER(2)}
        from: ${from}
        to: ${to}
        amount: ${ethers.utils.formatEther(convertedAmount)}
        bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
        network_fee: ${ethers.utils.formatEther(networkFee)}
        token_chain_1: ${token}
        token_chain_2: ${otherChainToken}
        timestamp: ${convertedTimestamp}
        nonce: ${convertedNonce}
        `);
    }
  );

  // Listen for (BurnWETH) event on CHAIN_1_CONTRACT
  CHAIN_1_CONTRACT.on(
    EVENTS.BURNWETH,
    async (
      from,
      to,
      bridgeFee,
      amount,
      token,
      timestamp,
      nonce,
      networkFeeContractAddress,
      networkFee
    ) => {
      console.log(MESSAGES.BURN(1));
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
      console.log("networkFee: ", ethers.utils.formatEther(networkFee));
      console.log("networkFee_contract_address: ", networkFeeContractAddress);
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      let alreadyQueuedTxs = await query_params(
        TABLES.TX_QUEUE,
        "nonce",
        convertedNonce
      );
      if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        sendMessage(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      if (alreadyQueuedTxs.length > 0) {
        console.log(MESSAGES.ALREADY_QUEUED);
        sendMessage(MESSAGES.ALREADY_QUEUED);
        return;
      }
      insert(TABLES.TX_QUEUE, [
        from,
        to,
        convertedAmount,
        convertedNonce,
        otherChainToken,
        convertedTimestamp,
        CHAINS.CHAIN_2,
        PROCESSED.FALSE,
        FUNCTIONS.UNLOCKETH,
      ]);
      // Sending notification to telegram bot
      sendMessage(`
       ${MESSAGES.BURN(1)}
       from: ${from}
       to: ${to}
       amount: ${ethers.utils.formatEther(convertedAmount)}
       bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
       network_fee: ${ethers.utils.formatEther(networkFee)}
       token_chain_1: ${token}
       token_chain_2: ${otherChainToken}
       timestamp: ${convertedTimestamp}
       nonce: ${convertedNonce}
       `);
    }
  );

  // Listen for (BurnWETH) event on CHAIN_2_CONTRACT
  CHAIN_2_CONTRACT.on(
    EVENTS.BURNWETH,
    async (
      from,
      to,
      bridgeFee,
      amount,
      token,
      timestamp,
      nonce,
      networkFeeContractAddress,
      networkFee
    ) => {
      console.log(MESSAGES.BURN(2));
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
      console.log("networkFee: ", ethers.utils.formatEther(networkFee));
      console.log("networkFee_contract_address: ", networkFeeContractAddress);
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      let otherChainToken = map_token_address_to_token_address[token];
      let convertedAmount = convertBigNumToString(amount);
      let convertedNonce = convertBigNumToString(nonce);
      let convertedTimestamp = convertBigNumToString(timestamp);
      let alreadyQueuedTxs = await query_params(
        TABLES.TX_QUEUE,
        "nonce",
        convertedNonce
      );
      if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        sendMessage(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      if (alreadyQueuedTxs.length > 0) {
        console.log(MESSAGES.ALREADY_QUEUED);
        sendMessage(MESSAGES.ALREADY_QUEUED);
        return;
      }
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
      // Sending notification to telegram bot
      sendMessage(`
        ${MESSAGES.BURN(2)}
        from: ${from}
        to: ${to}
        amount: ${ethers.utils.formatEther(convertedAmount)}
        bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
        network_fee: ${ethers.utils.formatEther(networkFee)}
        token_chain_1: ${token}
        token_chain_2: ${otherChainToken}
        timestamp: ${convertedTimestamp}
        nonce: ${convertedNonce}
        `);
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
