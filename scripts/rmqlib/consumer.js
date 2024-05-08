require("dotenv").config();
const { ethers } = require("hardhat");
const amqp = require("amqplib/callback_api");
const { consumeTx } = require("../../configs/util");
const {
  gasLimit,
  txProcessInterval,
  CHAINS,
  PROCESSED,
} = require("../../configs/constants");
const {
  abi: BRIDGE_ABI,
} = require("../../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const fs = require("fs-extra");
const { MESSAGES } = require("../../configs/messages");
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

let PRIVATE_KEY_PW = "";

async function processTransactionQueue(queue, ack) {
  try {
    let queue_chain_1 = [];
    let queue_chain_2 = [];
    console.log({ queue });
    if (queue.length > 0) {
      if (!PRIVATE_KEY_PW) {
        // PRIVATE_KEY_PW = await getParameterFromAWS();
        PRIVATE_KEY_PW = process.env.PRIVATE_KEY_PW;
      }
      for (let i = 0; i < queue.length; i++) {
        if (queue[i].processed === PROCESSED.FALSE) {
          // processed transactions will not exist in queue table, but it does not hurt to make an extra check here
          // continue if the transaction is not processed yet
          // start sorting the transactions
          if (queue[i].to_chain === CHAINS.CHAIN_1) {
            // saving into chain_1 queue temporary memory
            queue_chain_1.push(queue[i]);
          }
          if (queue[i].to_chain === CHAINS.CHAIN_2) {
            // saving into chain_2 queue temporary memory
            queue_chain_2.push(queue[i]);
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
      consumeTx(
        {
          queue: queue_chain_1,
          contract: CHAIN_1_CONTRACT,
          wallet: WALLET_CHAIN_1,
          method: queue_chain_1[0].function_type,
        },
        ack
      );
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
      consumeTx(
        {
          queue: queue_chain_2,
          contract: CHAIN_2_CONTRACT,
          wallet: WALLET_CHAIN_2,
          method: queue_chain_2[0].function_type,
        },
        ack
      );
    } else {
      console.log(MESSAGES.NO_TX(2));
    }
  } catch (err) {
    if (err) {
      console.log(err);
      // await sendMessage(JSON.stringify(err));
    }
  }
}

amqp.connect(amqp_server, function (error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }
    channel.assertQueue(queue, {
      durable: true,
    });
    channel.prefetch(1);
    console.log(MESSAGES.RBMQ_WAITING(queue));
    channel.consume(
      queue,
      function (msg) {
        let inner_queue = [];
        let parsedMessage = JSON.parse(msg.content.toString());
        console.log(MESSAGES.RBMQ_RECEIVED_MSG);
        console.log({ parsedMessage });
        inner_queue.push(parsedMessage);
        setInterval(async () => {
          await processTransactionQueue(inner_queue, {
            ack: () => channel.ack(msg),
            nack: () => channel.nack(msg),
          });
          inner_queue = [];
        }, txProcessInterval);
      },
      { noAck: false }
    );
  });
});
