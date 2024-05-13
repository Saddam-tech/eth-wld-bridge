require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs-extra");

const {
  abi: BRIDGE_ABI,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const {
  map_token_address_to_token_address,
  convertBigNumToString,
  consumeTx,
  formatAddress,
} = require("../configs/util");
const {
  gasLimit,
  txProcessInterval,
  CHAINS,
  PROCESSED,
  FUNCTIONS,
  CHAIN_IDS,
} = require("../configs/constants");
const { MESSAGES } = require("../configs/messages");
const { EVENTS } = require("../configs/events");
const { insert, query_all, query_params } = require("../db/queries");
const { TABLES } = require("../db/tables");
const { sendMessage, telegram_listener } = require("../configs/telegram_bot");
const { getParameterFromAWS } = require("../configs/vaultAccess");
const path = require("path");
const resolvePath = path.resolve(__dirname, "../.encryptedKey.json");
const encryptedJson = fs.readFileSync(resolvePath, "utf8");

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
          if (tx_queue[i].to_chain === CHAINS.CHAIN_1) {
            // saving into chain_1 queue temporary memory
            queue_chain_1.push(tx_queue[i]);
          }
          if (tx_queue[i].to_chain === CHAINS.CHAIN_2) {
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
    if (err) {
      console.log(err);
      await sendMessage(JSON.stringify(err));
    }
  }
}

async function monitorLockEvents() {
  try {
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
        networkFee,
        event
      ) => {
        try {
          console.log(MESSAGES.LOCK_TOKEN(1));
          console.log("from: ", formatAddress(from));
          console.log("to: ", formatAddress(to));
          console.log("amount: ", ethers.utils.formatEther(amount));
          console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
          console.log("networkFee: ", ethers.utils.formatEther(networkFee));
          console.log(
            "networkFee_contract_address: ",
            formatAddress(networkFeeContractAddress)
          );
          console.log("chain1token: ", formatAddress(token));
          console.log(
            "chain2token: ",
            formatAddress(map_token_address_to_token_address[token])
          );
          console.log("timestamp: ", timestamp);
          console.log("nonce: ", nonce);
          console.log("from_chain_id: ", CHAIN_IDS.C1);
          console.log("to_chain_id: ", CHAIN_IDS.C2);
          console.log("tx_hash: ", event?.transactionHash);
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
            await sendMessage(MESSAGES.ALREADY_PROCESSED);
            return;
          }
          if (alreadyQueuedTxs.length > 0) {
            console.log(MESSAGES.ALREADY_QUEUED);
            await sendMessage(MESSAGES.ALREADY_QUEUED);
            return;
          }
          insert(TABLES.TX_QUEUE, [
            from,
            to,
            convertedAmount,
            convertedNonce,
            otherChainToken,
            convertedTimestamp,
            PROCESSED.FALSE,
            FUNCTIONS.MINTTOKEN,
            CHAINS.CHAIN_1,
            CHAINS.CHAIN_2,
            CHAIN_IDS.C1,
            CHAIN_IDS.C2,
            event?.transactionHash,
          ]);
          // Sending notification to telegram bot
          await sendMessage(`
            ${MESSAGES.LOCK_TOKEN(1)}
from: ${formatAddress(from)}
to: ${formatAddress(to)}
amount: ${ethers.utils.formatEther(convertedAmount)}
bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
network_fee: ${ethers.utils.formatEther(networkFee)}
token_chain_1: ${formatAddress(token)}
token_chain_2: ${formatAddress(otherChainToken)}
timestamp: ${convertedTimestamp}
nonce: ${convertedNonce}
from_chain_id: ${CHAIN_IDS.C1}
to_chain_id: ${CHAIN_IDS.C2}
tx_hash_user: ${event?.transactionHash}
    `);
        } catch (err) {
          if (err) {
            console.log(err);
            await sendMessage(JSON.stringify(err));
          }
        }
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
        networkFee,
        event
      ) => {
        try {
          console.log(MESSAGES.LOCK_TOKEN(2));
          console.log("from: ", formatAddress(from));
          console.log("to: ", formatAddress(to));
          console.log("amount: ", ethers.utils.formatEther(amount));
          console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
          console.log("networkFee: ", ethers.utils.formatEther(networkFee));
          console.log(
            "networkFee_contract_address: ",
            formatAddress(networkFeeContractAddress)
          );
          console.log(
            "chain1token: ",
            formatAddress(map_token_address_to_token_address[token])
          );
          console.log("chain2token: ", formatAddress(token));
          console.log("timestamp: ", timestamp);
          console.log("nonce: ", nonce);
          console.log("from_chain_id: ", CHAIN_IDS.C2);
          console.log("to_chain_id: ", CHAIN_IDS.C1);
          console.log("tx_hash: ", event?.transactionHash);
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
            await sendMessage(MESSAGES.ALREADY_PROCESSED);
            return;
          }
          if (alreadyQueuedTxs.length > 0) {
            console.log(MESSAGES.ALREADY_QUEUED);
            await sendMessage(MESSAGES.ALREADY_QUEUED);
            return;
          }
          insert(TABLES.TX_QUEUE, [
            from,
            to,
            convertedAmount,
            convertedNonce,
            otherChainToken,
            convertedTimestamp,
            PROCESSED.FALSE,
            FUNCTIONS.MINTTOKEN,
            CHAINS.CHAIN_2,
            CHAINS.CHAIN_1,
            CHAIN_IDS.C2,
            CHAIN_IDS.C1,
            event?.transactionHash,
          ]);
          // Sending notification to telegram bot
          await sendMessage(`
            ${MESSAGES.LOCK_TOKEN(2)}
from: ${formatAddress(from)}
to: ${formatAddress(to)}
amount: ${ethers.utils.formatEther(convertedAmount)}
bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
network_fee: ${ethers.utils.formatEther(networkFee)}
token_chain_1: ${formatAddress(token)}
token_chain_2: ${formatAddress(otherChainToken)}
timestamp: ${convertedTimestamp}
nonce: ${convertedNonce}
from_chain_id: ${CHAIN_IDS.C2}
to_chain_id: ${CHAIN_IDS.C1}
tx_hash_user: ${event?.transactionHash}
    `);
        } catch (err) {
          if (err) {
            console.log(err);
            await sendMessage(JSON.stringify(err));
          }
        }
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
        networkFee,
        event
      ) => {
        try {
          console.log(MESSAGES.BURN_TOKEN(1));
          console.log("from: ", formatAddress(from));
          console.log("to: ", formatAddress(to));
          console.log("amount: ", ethers.utils.formatEther(amount));
          console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
          console.log("networkFee: ", ethers.utils.formatEther(networkFee));
          console.log(
            "networkFee_contract_address: ",
            formatAddress(networkFeeContractAddress)
          );
          console.log("chain1token: ", formatAddress(token));
          console.log(
            "chain2token: ",
            formatAddress(map_token_address_to_token_address[token])
          );
          console.log("timestamp: ", timestamp);
          console.log("nonce: ", nonce);
          console.log("from_chain_id: ", CHAIN_IDS.C1);
          console.log("to_chain_id: ", CHAIN_IDS.C2);
          console.log("tx_hash: ", event?.transactionHash);
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
            await sendMessage(MESSAGES.ALREADY_PROCESSED);
            return;
          }
          if (alreadyQueuedTxs.length > 0) {
            console.log(MESSAGES.ALREADY_QUEUED);
            await sendMessage(MESSAGES.ALREADY_QUEUED);
            return;
          }
          insert(TABLES.TX_QUEUE, [
            from,
            to,
            convertedAmount,
            convertedNonce,
            otherChainToken,
            convertedTimestamp,
            PROCESSED.FALSE,
            FUNCTIONS.UNLOCKTOKEN,
            CHAINS.CHAIN_1,
            CHAINS.CHAIN_2,
            CHAIN_IDS.C1,
            CHAIN_IDS.C2,
            event?.transactionHash,
          ]);
          // Sending notification to telegram bot
          await sendMessage(`
           ${MESSAGES.BURN_TOKEN(1)}
from: ${formatAddress(from)}
to: ${formatAddress(to)}
amount: ${ethers.utils.formatEther(convertedAmount)}
bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
network_fee: ${ethers.utils.formatEther(networkFee)}
token_chain_1: ${formatAddress(token)}
token_chain_2: ${formatAddress(otherChainToken)}
timestamp: ${convertedTimestamp}
nonce: ${convertedNonce}
from_chain_id: ${CHAIN_IDS.C1}
to_chain_id: ${CHAIN_IDS.C2}
tx_hash_user: ${event?.transactionHash}
    `);
        } catch (err) {
          if (err) {
            console.log(err);
            await sendMessage(JSON.stringify(err));
          }
        }
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
        networkFee,
        event
      ) => {
        try {
          console.log(MESSAGES.BURN_TOKEN(2));
          console.log("from: ", formatAddress(from));
          console.log("to: ", formatAddress(to));
          console.log("amount: ", ethers.utils.formatEther(amount));
          console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
          console.log("networkFee: ", ethers.utils.formatEther(networkFee));
          console.log(
            "networkFee_contract_address: ",
            formatAddress(networkFeeContractAddress)
          );
          console.log(
            "chain1token: ",
            formatAddress(map_token_address_to_token_address[token])
          );
          console.log("chain2token: ", formatAddress(token));
          console.log("timestamp: ", timestamp);
          console.log("nonce: ", nonce);
          console.log("from_chain_id: ", CHAIN_IDS.C2);
          console.log("to_chain_id: ", CHAIN_IDS.C1);
          console.log("tx_hash: ", event?.transactionHash);
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
            await sendMessage(MESSAGES.ALREADY_PROCESSED);
            return;
          }
          if (alreadyQueuedTxs.length > 0) {
            console.log(MESSAGES.ALREADY_QUEUED);
            await sendMessage(MESSAGES.ALREADY_QUEUED);
            return;
          }
          insert(TABLES.TX_QUEUE, [
            from,
            to,
            convertedAmount,
            convertedNonce,
            otherChainToken,
            convertedTimestamp,
            PROCESSED.FALSE,
            FUNCTIONS.UNLOCKTOKEN,
            CHAINS.CHAIN_2,
            CHAINS.CHAIN_1,
            CHAIN_IDS.C2,
            CHAIN_IDS.C1,
            event?.transactionHash,
          ]);
          // Sending notification to telegram bot
          await sendMessage(`
             ${MESSAGES.BURN_TOKEN(2)}
from: ${formatAddress(from)}
to: ${formatAddress(to)}
amount: ${ethers.utils.formatEther(convertedAmount)}
bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
network_fee: ${ethers.utils.formatEther(networkFee)}
token_chain_1: ${formatAddress(token)}
token_chain_2: ${formatAddress(otherChainToken)}
timestamp: ${convertedTimestamp}
nonce: ${convertedNonce}
from_chain_id: ${CHAIN_IDS.C2}
to_chain_id: ${CHAIN_IDS.C1}
tx_hash_user: ${event?.transactionHash}
    `);
        } catch (err) {
          if (err) {
            console.log(err);
            await sendMessage(JSON.stringify(err));
          }
        }
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
        networkFee,
        event
      ) => {
        try {
          console.log(MESSAGES.LOCK_ETH(1));
          console.log("from: ", formatAddress(from));
          console.log("to: ", formatAddress(to));
          console.log("amount: ", ethers.utils.formatEther(amount));
          console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
          console.log("networkFee: ", ethers.utils.formatEther(networkFee));
          console.log(
            "networkFee_contract_address: ",
            formatAddress(networkFeeContractAddress)
          );
          console.log("chain1token: ", token);
          console.log(
            "chain2token: ",
            map_token_address_to_token_address[token]
          );
          console.log("timestamp: ", timestamp);
          console.log("nonce: ", nonce);
          console.log("from_chain_id: ", CHAIN_IDS.C1);
          console.log("to_chain_id: ", CHAIN_IDS.C2);
          console.log("tx_hash: ", event?.transactionHash);
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
            await sendMessage(MESSAGES.ALREADY_PROCESSED);
            return;
          }
          if (alreadyQueuedTxs.length > 0) {
            console.log(MESSAGES.ALREADY_QUEUED);
            await sendMessage(MESSAGES.ALREADY_QUEUED);
            return;
          }
          insert(TABLES.TX_QUEUE, [
            from,
            to,
            convertedAmount,
            convertedNonce,
            otherChainToken,
            convertedTimestamp,
            PROCESSED.FALSE,
            FUNCTIONS.MINTWETH,
            CHAINS.CHAIN_1,
            CHAINS.CHAIN_2,
            CHAIN_IDS.C1,
            CHAIN_IDS.C2,
            event?.transactionHash,
          ]);
          // Sending notification to telegram bot
          await sendMessage(`
           ${MESSAGES.LOCK_ETH(1)}
from: ${formatAddress(from)}
to: ${formatAddress(to)}
amount: ${ethers.utils.formatEther(convertedAmount)}
bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
network_fee: ${ethers.utils.formatEther(networkFee)}
token_chain_1: ${formatAddress(token)}
token_chain_2: ${formatAddress(otherChainToken)}
timestamp: ${convertedTimestamp}
nonce: ${convertedNonce}
from_chain_id: ${CHAIN_IDS.C1}
to_chain_id: ${CHAIN_IDS.C2}
tx_hash_user: ${event?.transactionHash}
    `);
        } catch (err) {
          if (err) {
            console.log(err);
            await sendMessage(JSON.stringify(err));
          }
        }
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
        networkFee,
        event
      ) => {
        try {
          console.log(MESSAGES.LOCK_ETH(2));
          console.log("from: ", formatAddress(from));
          console.log("to: ", formatAddress(to));
          console.log("amount: ", ethers.utils.formatEther(amount));
          console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
          console.log("networkFee: ", ethers.utils.formatEther(networkFee));
          console.log(
            "networkFee_contract_address: ",
            formatAddress(networkFeeContractAddress)
          );
          console.log(
            "chain1token: ",
            formatAddress(map_token_address_to_token_address[token])
          );
          console.log("chain2token: ", formatAddress(token));
          console.log("timestamp: ", timestamp);
          console.log("nonce: ", nonce);
          console.log("from_chain_id: ", CHAIN_IDS.C2);
          console.log("to_chain_id: ", CHAIN_IDS.C1);
          console.log("tx_hash: ", event?.transactionHash);
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
            await sendMessage(MESSAGES.ALREADY_PROCESSED);
            return;
          }
          if (alreadyQueuedTxs.length > 0) {
            console.log(MESSAGES.ALREADY_QUEUED);
            await sendMessage(MESSAGES.ALREADY_QUEUED);
            return;
          }
          insert(TABLES.TX_QUEUE, [
            from,
            to,
            convertedAmount,
            convertedNonce,
            otherChainToken,
            convertedTimestamp,
            PROCESSED.FALSE,
            FUNCTIONS.MINTWETH,
            CHAINS.CHAIN_2,
            CHAINS.CHAIN_1,
            CHAIN_IDS.C2,
            CHAIN_IDS.C1,
            event?.transactionHash,
          ]);
          // Sending notification to telegram bot
          await sendMessage(`
            ${MESSAGES.LOCK_ETH(2)}
from: ${formatAddress(from)}
to: ${formatAddress(to)}
amount: ${ethers.utils.formatEther(convertedAmount)}
bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
network_fee: ${ethers.utils.formatEther(networkFee)}
token_chain_1: ${formatAddress(token)}
token_chain_2: ${formatAddress(otherChainToken)}
timestamp: ${convertedTimestamp}
nonce: ${convertedNonce}
from_chain_id: ${CHAIN_IDS.C2}
to_chain_id: ${CHAIN_IDS.C1}
tx_hash_user: ${event?.transactionHash}
    `);
        } catch (err) {
          if (err) {
            console.log(err);
            await sendMessage(JSON.stringify(err));
          }
        }
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
        networkFee,
        event
      ) => {
        try {
          console.log(MESSAGES.BURN_WETH(1));
          console.log("to: ", formatAddress(to));
          console.log("amount: ", ethers.utils.formatEther(amount));
          console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
          console.log("networkFee: ", ethers.utils.formatEther(networkFee));
          console.log(
            "networkFee_contract_address: ",
            formatAddress(networkFeeContractAddress)
          );
          console.log("chain1token: ", formatAddress(token));
          console.log(
            "chain2token: ",
            formatAddress(map_token_address_to_token_address[token])
          );
          console.log("timestamp: ", timestamp);
          console.log("nonce: ", nonce);
          console.log("from_chain_id: ", CHAIN_IDS.C1);
          console.log("to_chain_id: ", CHAIN_IDS.C2);
          console.log("tx_hash: ", event?.transactionHash);
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
            await sendMessage(MESSAGES.ALREADY_PROCESSED);
            return;
          }
          if (alreadyQueuedTxs.length > 0) {
            console.log(MESSAGES.ALREADY_QUEUED);
            await sendMessage(MESSAGES.ALREADY_QUEUED);
            return;
          }
          insert(TABLES.TX_QUEUE, [
            from,
            to,
            convertedAmount,
            convertedNonce,
            otherChainToken,
            convertedTimestamp,
            PROCESSED.FALSE,
            FUNCTIONS.UNLOCKETH,
            CHAINS.CHAIN_1,
            CHAINS.CHAIN_2,
            CHAIN_IDS.C1,
            CHAIN_IDS.C2,
            event?.transactionHash,
          ]);
          // Sending notification to telegram bot
          await sendMessage(`
           ${MESSAGES.BURN_WETH(1)}
from: ${formatAddress(from)}
to: ${formatAddress(to)}
amount: ${ethers.utils.formatEther(convertedAmount)}
bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
network_fee: ${ethers.utils.formatEther(networkFee)}
token_chain_1: ${formatAddress(token)}
token_chain_2: ${formatAddress(otherChainToken)}
timestamp: ${convertedTimestamp}
nonce: ${convertedNonce}
from_chain_id: ${CHAIN_IDS.C1}
to_chain_id: ${CHAIN_IDS.C2}
tx_hash_user: ${event?.transactionHash}
    `);
        } catch (err) {
          if (err) {
            console.log(err);
            await sendMessage(JSON.stringify(err));
          }
        }
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
        networkFee,
        event
      ) => {
        try {
          console.log(MESSAGES.BURN_WETH(2));
          console.log("to: ", formatAddress(to));
          console.log("amount: ", ethers.utils.formatEther(amount));
          console.log("bridgeFee: ", ethers.utils.formatEther(bridgeFee));
          console.log("networkFee: ", ethers.utils.formatEther(networkFee));
          console.log(
            "networkFee_contract_address: ",
            formatAddress(networkFeeContractAddress)
          );
          console.log(
            "chain1token: ",
            formatAddress(map_token_address_to_token_address[token])
          );
          console.log("chain2token: ", formatAddress(token));
          console.log("timestamp: ", timestamp);
          console.log("nonce: ", nonce);
          console.log("from_chain_id: ", CHAIN_IDS.C2);
          console.log("to_chain_id: ", CHAIN_IDS.C1);
          console.log("tx_hash: ", event?.transactionHash);
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
            await sendMessage(MESSAGES.ALREADY_PROCESSED);
            return;
          }
          if (alreadyQueuedTxs.length > 0) {
            console.log(MESSAGES.ALREADY_QUEUED);
            await sendMessage(MESSAGES.ALREADY_QUEUED);
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
            CHAINS.CHAIN_2,
            CHAINS.CHAIN_1,
            CHAIN_IDS.C2,
            CHAIN_IDS.C1,
            event?.transactionHash,
          ]);
          // Sending notification to telegram bot
          await sendMessage(`
            ${MESSAGES.BURN_WETH(2)}
from: ${formatAddress(from)}
to: ${formatAddress(to)}
amount: ${ethers.utils.formatEther(convertedAmount)}
bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
network_fee: ${ethers.utils.formatEther(networkFee)}
token_chain_1: ${formatAddress(token)}
token_chain_2: ${formatAddress(otherChainToken)}
timestamp: ${convertedTimestamp}
nonce: ${convertedNonce}
from_chain_id: ${CHAIN_IDS.C2}
to_chain_id: ${CHAIN_IDS.C1}
tx_hash_user: ${event?.transactionHash}
    `);
        } catch (err) {
          if (err) {
            console.log(err);
            await sendMessage(JSON.stringify(err));
          }
        }
      }
    );

    // listen for telegram queries
    telegram_listener();
    // Process tx queue in batch every 15 secs
    setInterval(async () => {
      await processTransactionQueue();
    }, txProcessInterval);
  } catch (err) {
    if (err) {
      console.log(err);
      await sendMessage(JSON.stringify(err));
    }
  }
}

monitorLockEvents().catch((err) => {
  console.log(err);
  process.exit(1);
});
