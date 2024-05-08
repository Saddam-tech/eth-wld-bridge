require("dotenv").config();
const { ethers } = require("hardhat");
const amqp = require("amqplib/callback_api");
const fs = require("fs-extra");
const {
  abi: BRIDGE_ABI,
} = require("../../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const {
  map_token_address_to_token_address,
  convertBigNumToString,
  formatAddress,
} = require("../../configs/util");
const {
  gasLimit,
  txProcessInterval,
  CHAINS,
  PROCESSED,
  FUNCTIONS,
  CHAIN_IDS,
} = require("../../configs/constants");
const { MESSAGES } = require("../../configs/messages");
const { EVENTS } = require("../../configs/events");
// const { insert, query_all, query_params } = require("../../db/queries");
const { TABLES } = require("../../db/tables");
// const {
//   sendMessage,
//   telegram_listener,
// } = require("../../configs/telegram_bot");
const { getParameterFromAWS } = require("../../configs/vaultAccess");
const path = require("path");
const resolvePath = path.resolve(__dirname, "../../.encryptedKey.json");
const encryptedJson = fs.readFileSync(resolvePath, "utf8");
const amqp_server = process.env.AMQP_SERVER;
const queue = process.env.QUEUE_NAME;
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

async function monitorLockEvents() {
  try {
    amqp.connect(amqp_server, function (error0, connection) {
      if (error0) {
        throw error0;
      }
      console.log(MESSAGES.RBMQ_CONNECT);
      connection.createChannel(function (error1, channel) {
        if (error1) {
          throw error1;
        }
        console.log(MESSAGES.RBMQ_CHANNEL_CREATED);
        channel.assertQueue(queue, {
          durable: true,
        });
        console.log(MESSAGES.RBMQ_QUEUE_ADDED);
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
              // let alreadyQueuedTxs = await query_params(
              //   TABLES.TX_QUEUE,
              //   "nonce",
              //   convertedNonce
              // );
              if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
                console.log(MESSAGES.ALREADY_PROCESSED);
                // await sendMessage(MESSAGES.ALREADY_PROCESSED);
                return;
              }
              // if (alreadyQueuedTxs.length > 0) {
              //   console.log(MESSAGES.ALREADY_QUEUED);
              //   await sendMessage(MESSAGES.ALREADY_QUEUED);
              //   return;
              // }
              let tx_data = {
                from,
                to,
                amount: convertedAmount,
                nonce: convertedNonce,
                token: otherChainToken,
                timestamp: convertedTimestamp,
                processed: PROCESSED.FALSE,
                method: FUNCTIONS.MINTTOKEN,
                from_chain: CHAINS.CHAIN_1,
                to_chain: CHAINS.CHAIN_2,
                from_chain_id: CHAIN_IDS.C1,
                to_chain_id: CHAIN_IDS.C2,
                tx_hash: event?.transactionHash,
              };
              tx_data = JSON.stringify(tx_data);
              channel.sendToQueue(queue, Buffer.from(tx_data), {
                persistent: true,
              });

              // Sending notification to telegram bot
              //               await sendMessage(`
              //             ${MESSAGES.LOCK_TOKEN(1)}
              // from: ${formatAddress(from)}
              // to: ${formatAddress(to)}
              // amount: ${ethers.utils.formatEther(convertedAmount)}
              // bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
              // network_fee: ${ethers.utils.formatEther(networkFee)}
              // token_chain_1: ${formatAddress(token)}
              // token_chain_2: ${formatAddress(otherChainToken)}
              // timestamp: ${convertedTimestamp}
              // nonce: ${convertedNonce}
              // from_chain_id: ${CHAIN_IDS.C1}
              // to_chain_id: ${CHAIN_IDS.C2}
              // tx_hash_user: ${event?.transactionHash}
              //     `);
            } catch (err) {
              if (err) {
                console.log(err);
                // await sendMessage(JSON.stringify(err));
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
              // let alreadyQueuedTxs = await query_params(
              //   TABLES.TX_QUEUE,
              //   "nonce",
              //   convertedNonce
              // );
              if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
                console.log(MESSAGES.ALREADY_PROCESSED);
                // await sendMessage(MESSAGES.ALREADY_PROCESSED);
                return;
              }
              // if (alreadyQueuedTxs.length > 0) {
              //   console.log(MESSAGES.ALREADY_QUEUED);
              //   await sendMessage(MESSAGES.ALREADY_QUEUED);
              //   return;
              // }
              let tx_data = {
                from,
                to,
                amount: convertedAmount,
                nonce: convertedNonce,
                token: otherChainToken,
                timestamp: convertedTimestamp,
                processed: PROCESSED.FALSE,
                method: FUNCTIONS.MINTTOKEN,
                from_chain: CHAINS.CHAIN_2,
                to_chain: CHAINS.CHAIN_1,
                from_chain_id: CHAIN_IDS.C2,
                to_chain_id: CHAIN_IDS.C1,
                tx_hash: event?.transactionHash,
              };
              tx_data = JSON.stringify(tx_data);
              channel.sendToQueue(queue, Buffer.from(tx_data), {
                persistent: true,
              });

              // Sending notification to telegram bot
              //               await sendMessage(`
              //             ${MESSAGES.LOCK_TOKEN(2)}
              // from: ${formatAddress(from)}
              // to: ${formatAddress(to)}
              // amount: ${ethers.utils.formatEther(convertedAmount)}
              // bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
              // network_fee: ${ethers.utils.formatEther(networkFee)}
              // token_chain_1: ${formatAddress(token)}
              // token_chain_2: ${formatAddress(otherChainToken)}
              // timestamp: ${convertedTimestamp}
              // nonce: ${convertedNonce}
              // from_chain_id: ${CHAIN_IDS.C2}
              // to_chain_id: ${CHAIN_IDS.C1}
              // tx_hash_user: ${event?.transactionHash}
              //     `);
            } catch (err) {
              if (err) {
                console.log(err);
                // await sendMessage(JSON.stringify(err));
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
              // let alreadyQueuedTxs = await query_params(
              //   TABLES.TX_QUEUE,
              //   "nonce",
              //   convertedNonce
              // );
              if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
                console.log(MESSAGES.ALREADY_PROCESSED);
                // await sendMessage(MESSAGES.ALREADY_PROCESSED);
                return;
              }
              // if (alreadyQueuedTxs.length > 0) {
              //   console.log(MESSAGES.ALREADY_QUEUED);
              //   await sendMessage(MESSAGES.ALREADY_QUEUED);
              //   return;
              // }
              let tx_data = {
                from,
                to,
                amount: convertedAmount,
                nonce: convertedNonce,
                token: otherChainToken,
                timestamp: convertedTimestamp,
                processed: PROCESSED.FALSE,
                method: FUNCTIONS.UNLOCKTOKEN,
                from_chain: CHAINS.CHAIN_1,
                to_chain: CHAINS.CHAIN_2,
                from_chain_id: CHAIN_IDS.C1,
                to_chain_id: CHAIN_IDS.C2,
                tx_hash: event?.transactionHash,
              };
              tx_data = JSON.stringify(tx_data);
              channel.sendToQueue(queue, Buffer.from(tx_data), {
                persistent: true,
              });
              // Sending notification to telegram bot
              //               await sendMessage(`
              //            ${MESSAGES.BURN_TOKEN(1)}
              // from: ${formatAddress(from)}
              // to: ${formatAddress(to)}
              // amount: ${ethers.utils.formatEther(convertedAmount)}
              // bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
              // network_fee: ${ethers.utils.formatEther(networkFee)}
              // token_chain_1: ${formatAddress(token)}
              // token_chain_2: ${formatAddress(otherChainToken)}
              // timestamp: ${convertedTimestamp}
              // nonce: ${convertedNonce}
              // from_chain_id: ${CHAIN_IDS.C1}
              // to_chain_id: ${CHAIN_IDS.C2}
              // tx_hash_user: ${event?.transactionHash}
              //     `);
            } catch (err) {
              if (err) {
                console.log(err);
                // await sendMessage(JSON.stringify(err));
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
              // let alreadyQueuedTxs = await query_params(
              //   TABLES.TX_QUEUE,
              //   "nonce",
              //   convertedNonce
              // );
              if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
                console.log(MESSAGES.ALREADY_PROCESSED);
                // await sendMessage(MESSAGES.ALREADY_PROCESSED);
                return;
              }
              // if (alreadyQueuedTxs.length > 0) {
              //   console.log(MESSAGES.ALREADY_QUEUED);
              //   await sendMessage(MESSAGES.ALREADY_QUEUED);
              //   return;
              // }
              let tx_data = {
                from,
                to,
                amount: convertedAmount,
                nonce: convertedNonce,
                token: otherChainToken,
                timestamp: convertedTimestamp,
                processed: PROCESSED.FALSE,
                method: FUNCTIONS.UNLOCKTOKEN,
                from_chain: CHAINS.CHAIN_2,
                to_chain: CHAINS.CHAIN_1,
                from_chain_id: CHAIN_IDS.C2,
                to_chain_id: CHAIN_IDS.C1,
                tx_hash: event?.transactionHash,
              };
              tx_data = JSON.stringify(tx_data);
              channel.sendToQueue(queue, Buffer.from(tx_data), {
                persistent: true,
              });
              // Sending notification to telegram bot
              //               await sendMessage(`
              //              ${MESSAGES.BURN_TOKEN(2)}
              // from: ${formatAddress(from)}
              // to: ${formatAddress(to)}
              // amount: ${ethers.utils.formatEther(convertedAmount)}
              // bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
              // network_fee: ${ethers.utils.formatEther(networkFee)}
              // token_chain_1: ${formatAddress(token)}
              // token_chain_2: ${formatAddress(otherChainToken)}
              // timestamp: ${convertedTimestamp}
              // nonce: ${convertedNonce}
              // from_chain_id: ${CHAIN_IDS.C2}
              // to_chain_id: ${CHAIN_IDS.C1}
              // tx_hash_user: ${event?.transactionHash}
              //     `);
            } catch (err) {
              if (err) {
                console.log(err);
                // await sendMessage(JSON.stringify(err));
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
              // let alreadyQueuedTxs = await query_params(
              //   TABLES.TX_QUEUE,
              //   "nonce",
              //   convertedNonce
              // );
              if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
                console.log(MESSAGES.ALREADY_PROCESSED);
                await sendMessage(MESSAGES.ALREADY_PROCESSED);
                return;
              }
              // if (alreadyQueuedTxs.length > 0) {
              //   console.log(MESSAGES.ALREADY_QUEUED);
              //   await sendMessage(MESSAGES.ALREADY_QUEUED);
              //   return;
              // }
              let tx_data = {
                from,
                to,
                amount: convertedAmount,
                nonce: convertedNonce,
                token: otherChainToken,
                timestamp: convertedTimestamp,
                processed: PROCESSED.FALSE,
                method: FUNCTIONS.MINTWETH,
                from_chain: CHAINS.CHAIN_1,
                to_chain: CHAINS.CHAIN_2,
                from_chain_id: CHAIN_IDS.C1,
                to_chain_id: CHAIN_IDS.C2,
                tx_hash: event?.transactionHash,
              };
              tx_data = JSON.stringify(tx_data);
              channel.sendToQueue(queue, Buffer.from(tx_data), {
                persistent: true,
              });
              // Sending notification to telegram bot
              //               await sendMessage(`
              //            ${MESSAGES.LOCK_ETH(1)}
              // from: ${formatAddress(from)}
              // to: ${formatAddress(to)}
              // amount: ${ethers.utils.formatEther(convertedAmount)}
              // bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
              // network_fee: ${ethers.utils.formatEther(networkFee)}
              // token_chain_1: ${formatAddress(token)}
              // token_chain_2: ${formatAddress(otherChainToken)}
              // timestamp: ${convertedTimestamp}
              // nonce: ${convertedNonce}
              // from_chain_id: ${CHAIN_IDS.C1}
              // to_chain_id: ${CHAIN_IDS.C2}
              // tx_hash_user: ${event?.transactionHash}
              //     `);
            } catch (err) {
              if (err) {
                console.log(err);
                // await sendMessage(JSON.stringify(err));
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
              // let alreadyQueuedTxs = await query_params(
              //   TABLES.TX_QUEUE,
              //   "nonce",
              //   convertedNonce
              // );
              if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
                console.log(MESSAGES.ALREADY_PROCESSED);
                // await sendMessage(MESSAGES.ALREADY_PROCESSED);
                return;
              }
              // if (alreadyQueuedTxs.length > 0) {
              //   console.log(MESSAGES.ALREADY_QUEUED);
              //   await sendMessage(MESSAGES.ALREADY_QUEUED);
              //   return;
              // }
              let tx_data = {
                from,
                to,
                amount: convertedAmount,
                nonce: convertedNonce,
                token: otherChainToken,
                timestamp: convertedTimestamp,
                processed: PROCESSED.FALSE,
                method: FUNCTIONS.MINTWETH,
                from_chain: CHAINS.CHAIN_2,
                to_chain: CHAINS.CHAIN_1,
                from_chain_id: CHAIN_IDS.C2,
                to_chain_id: CHAIN_IDS.C1,
                tx_hash: event?.transactionHash,
              };
              tx_data = JSON.stringify(tx_data);
              channel.sendToQueue(queue, Buffer.from(tx_data), {
                persistent: true,
              });
              // Sending notification to telegram bot
              //               await sendMessage(`
              //             ${MESSAGES.LOCK_ETH(2)}
              // from: ${formatAddress(from)}
              // to: ${formatAddress(to)}
              // amount: ${ethers.utils.formatEther(convertedAmount)}
              // bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
              // network_fee: ${ethers.utils.formatEther(networkFee)}
              // token_chain_1: ${formatAddress(token)}
              // token_chain_2: ${formatAddress(otherChainToken)}
              // timestamp: ${convertedTimestamp}
              // nonce: ${convertedNonce}
              // from_chain_id: ${CHAIN_IDS.C2}
              // to_chain_id: ${CHAIN_IDS.C1}
              // tx_hash_user: ${event?.transactionHash}
              //     `);
            } catch (err) {
              if (err) {
                console.log(err);
                // await sendMessage(JSON.stringify(err));
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
              // let alreadyQueuedTxs = await query_params(
              //   TABLES.TX_QUEUE,
              //   "nonce",
              //   convertedNonce
              // );
              if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
                console.log(MESSAGES.ALREADY_PROCESSED);
                // await sendMessage(MESSAGES.ALREADY_PROCESSED);
                return;
              }
              // if (alreadyQueuedTxs.length > 0) {
              //   console.log(MESSAGES.ALREADY_QUEUED);
              //   await sendMessage(MESSAGES.ALREADY_QUEUED);
              //   return;
              // }
              // insert(TABLES.TX_QUEUE, [
              //   from,
              //   to,
              //   convertedAmount,
              //   convertedNonce,
              //   otherChainToken,
              //   convertedTimestamp,
              //   PROCESSED.FALSE,
              //   FUNCTIONS.UNLOCKETH,
              //   CHAINS.CHAIN_1,
              //   CHAINS.CHAIN_2,
              //   CHAIN_IDS.C1,
              //   CHAIN_IDS.C2,
              //   event?.transactionHash,
              // ]);
              let tx_data = {
                from,
                to,
                amount: convertedAmount,
                nonce: convertedNonce,
                token: otherChainToken,
                timestamp: convertedTimestamp,
                processed: PROCESSED.FALSE,
                method: FUNCTIONS.UNLOCKETH,
                from_chain: CHAINS.CHAIN_1,
                to_chain: CHAINS.CHAIN_2,
                from_chain_id: CHAIN_IDS.C1,
                to_chain_id: CHAIN_IDS.C2,
                tx_hash: event?.transactionHash,
              };
              tx_data = JSON.stringify(tx_data);
              channel.sendToQueue(queue, Buffer.from(tx_data), {
                persistent: true,
              });
              // Sending notification to telegram bot
              //               await sendMessage(`
              //            ${MESSAGES.BURN_WETH(1)}
              // from: ${formatAddress(from)}
              // to: ${formatAddress(to)}
              // amount: ${ethers.utils.formatEther(convertedAmount)}
              // bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
              // network_fee: ${ethers.utils.formatEther(networkFee)}
              // token_chain_1: ${formatAddress(token)}
              // token_chain_2: ${formatAddress(otherChainToken)}
              // timestamp: ${convertedTimestamp}
              // nonce: ${convertedNonce}
              // from_chain_id: ${CHAIN_IDS.C1}
              // to_chain_id: ${CHAIN_IDS.C2}
              // tx_hash_user: ${event?.transactionHash}
              //     `);
            } catch (err) {
              if (err) {
                console.log(err);
                // await sendMessage(JSON.stringify(err));
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
              // let alreadyQueuedTxs = await query_params(
              //   TABLES.TX_QUEUE,
              //   "nonce",
              //   convertedNonce
              // );
              if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
                console.log(MESSAGES.ALREADY_PROCESSED);
                // await sendMessage(MESSAGES.ALREADY_PROCESSED);
                return;
              }
              // if (alreadyQueuedTxs.length > 0) {
              //   console.log(MESSAGES.ALREADY_QUEUED);
              //   await sendMessage(MESSAGES.ALREADY_QUEUED);
              //   return;
              // }
              // insert(TABLES.TX_QUEUE, [
              //   from,
              //   to,
              //   convertedAmount,
              //   convertedNonce,
              //   otherChainToken,
              //   convertedTimestamp,
              //   CHAINS.CHAIN_1,
              //   PROCESSED.FALSE,
              //   FUNCTIONS.UNLOCKETH,
              //   CHAINS.CHAIN_2,
              //   CHAINS.CHAIN_1,
              //   CHAIN_IDS.C2,
              //   CHAIN_IDS.C1,
              //   event?.transactionHash,
              // ]);
              let tx_data = {
                from,
                to,
                amount: convertedAmount,
                nonce: convertedNonce,
                token: otherChainToken,
                timestamp: convertedTimestamp,
                processed: PROCESSED.FALSE,
                method: FUNCTIONS.UNLOCKETH,
                from_chain: CHAINS.CHAIN_2,
                to_chain: CHAINS.CHAIN_1,
                from_chain_id: CHAIN_IDS.C2,
                to_chain_id: CHAIN_IDS.C1,
                tx_hash: event?.transactionHash,
              };
              tx_data = JSON.stringify(tx_data);
              channel.sendToQueue(queue, Buffer.from(tx_data), {
                persistent: true,
              });
              // Sending notification to telegram bot
              //               await sendMessage(`
              //             ${MESSAGES.BURN_WETH(2)}
              // from: ${formatAddress(from)}
              // to: ${formatAddress(to)}
              // amount: ${ethers.utils.formatEther(convertedAmount)}
              // bridge_fee: ${ethers.utils.formatEther(bridgeFee)}
              // network_fee: ${ethers.utils.formatEther(networkFee)}
              // token_chain_1: ${formatAddress(token)}
              // token_chain_2: ${formatAddress(otherChainToken)}
              // timestamp: ${convertedTimestamp}
              // nonce: ${convertedNonce}
              // from_chain_id: ${CHAIN_IDS.C2}
              // to_chain_id: ${CHAIN_IDS.C1}
              // tx_hash_user: ${event?.transactionHash}
              //     `);
            } catch (err) {
              if (err) {
                console.log(err);
                // await sendMessage(JSON.stringify(err));
              }
            }
          }
        );

        // listen for telegram queries
        // telegram_listener();
        // Process tx queue in batch every 15 secs
        // setInterval(async () => {
        //   await processTransactionQueue();
        // }, txProcessInterval);
      });
    });
  } catch (err) {
    if (err) {
      console.log(err);
      // await sendMessage(JSON.stringify(err));
    }
  }
}

monitorLockEvents().catch((err) => {
  console.log(err);
  process.exit(1);
});
