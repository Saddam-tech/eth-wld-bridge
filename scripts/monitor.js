const { ethers } = require("hardhat");
require("dotenv").config();
const {
  map_token_address_to_token_address,
  createSignature,
  message_type,
} = require("../util/util");
const { txProcessInterval } = require("../configs/constants");
const {
  CHAIN1_CONTRACT,
  CHAIN2_CONTRACT,
  WALLET_CHAIN1,
  WALLET_CHAIN2,
} = require("../configs/constants");
const { EVENTS } = require("../configs/events");
const { MESSAGES } = require("../configs/messages");

const transactionQueueChain1 = [];
const transactionQueueChain2 = [];

async function processTransactionQueue() {
  try {
    // chain1 execution
    if (transactionQueueChain1.length > 0) {
      const resolved = await Promise.all(transactionQueueChain1);
      console.log({ resolved });
      resolved.forEach(() => {
        transactionQueueChain1.shift();
      });
      console.log(MESSAGES.BATCH_PROCESSED(1, resolved.length));
    } else {
      console.log(MESSAGES.NO_TX(1));
    }

    // chain2 execution
    if (transactionQueueChain2.length > 0) {
      const resolved = await Promise.all(transactionQueueChain2);
      console.log({ resolved });
      resolved.forEach(() => {
        transactionQueueChain2.shift();
      });
      console.log(MESSAGES.BATCH_PROCESSED(2, resolved.length));
    } else {
      console.log(MESSAGES.NO_TX(2));
    }
  } catch (err) {
    console.log(err);
  }
}

async function monitorLockEvents() {
  console.log(MESSAGES.INIT);
  // Listen for the Lock event on the CHAIN1_CONTRACT
  let admin_nonce_chain1 = await WALLET_CHAIN1.getTransactionCount();
  let admin_nonce_chain2 = await WALLET_CHAIN2.getTransactionCount();
  CHAIN1_CONTRACT.on(
    EVENTS.TRANSFER_TOKEN,
    async (from, to, amount, token, timestamp, tokenType, nonce) => {
      console.log(MESSAGES.TRANSFER_TOKEN(1));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("token_name: ", tokenType);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      let admin_signature = await createSignature(message_type, [
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
      ]);
      console.log({ admin_nonce_chain2 });
      // Check if the same transaction is being executed the second time
      if (await CHAIN2_CONTRACT.processedNonces(to, nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      // Mint the same amount of tokens on chain 2 using the admin private key

      const tx = CHAIN2_CONTRACT.connect(WALLET_CHAIN2).mintToken(
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
        admin_signature,
        {
          nonce: admin_nonce_chain2,
        }
      );
      transactionQueueChain2.push(tx);
      admin_nonce_chain2 += 1;
    }
  );

  // Listen for the Lock event on the CHAIN2_CONTRACT
  CHAIN2_CONTRACT.on(
    EVENTS.TRANSFER_TOKEN,
    async (from, to, amount, token, timestamp, tokenType, nonce) => {
      console.log(MESSAGES.TRANSFER_TOKEN(2));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("token_name: ", tokenType);
      console.log("nonce: ", nonce);
      let admin_signature = await createSignature(message_type, [
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
      ]);
      console.log({ admin_nonce_chain1 });
      // Check if the same transaction is being executed the second time
      if (await CHAIN1_CONTRACT.processedNonces(to, nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      // Check if the balance of user is enough
      let _amount = ethers.utils.formatEther(amount);
      let chain1_user_balance = ethers.utils.formatEther(
        await CHAIN1_CONTRACT.userBalances(
          to,
          map_token_address_to_token_address[token]
        )
      );
      if (parseFloat(chain1_user_balance) < parseFloat(_amount)) {
        console.log(MESSAGES.LOW_BALANCE(_amount, chain1_user_balance));
        console.log(MESSAGES.REVERT_ACTION);
        return;
      }
      // Unlock the same amount of tokens on chain 1 using the admin private key
      const tx = CHAIN1_CONTRACT.connect(WALLET_CHAIN1).unlockToken(
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
        admin_signature,
        {
          nonce: admin_nonce_chain1,
        }
      );

      transactionQueueChain1.push(tx);
      admin_nonce_chain1 += 1;
    }
  );

  // BRIDGING WETH

  // Listen for the (LockETH) event on the CHAIN1_CONTRACT

  CHAIN1_CONTRACT.on(
    EVENTS.LOCK_ETH,
    async (from, to, amount, token, date, nonce) => {
      console.log(MESSAGES.ETH_TRANSFER(1));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("date: ", date);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      if (await CHAIN2_CONTRACT.processedNonces(to, nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      let admin_signature = await createSignature(message_type, [
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
      ]);
      console.log({ admin_nonce_chain2 });
      // Mint the same amount of tokens on chain 2 using the admin private key
      const tx = CHAIN2_CONTRACT.connect(WALLET_CHAIN2).mintWETH(
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
        admin_signature,
        {
          nonce: admin_nonce_chain2,
        }
      );
      console.log({ tx });
      transactionQueueChain2.push(tx);
      admin_nonce_chain2 += 1;
    }
  );
  // Listen for (LockETH) event on CHAIN2_CONTRACT
  CHAIN2_CONTRACT.on(
    EVENTS.LOCK_ETH,
    async (from, to, amount, token, date, nonce) => {
      console.log(MESSAGES.ETH_TRANSFER(2));
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("date: ", date);
      console.log("nonce: ", nonce);
      if (await CHAIN1_CONTRACT.processedNonces(to, nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      let admin_signature = await createSignature(message_type, [
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
      ]);
      console.log({ admin_nonce_chain1 });
      // Unlock the same amount of tokens on chain 1 using the admin private key
      const tx = CHAIN1_CONTRACT.connect(WALLET_CHAIN1).mintWETH(
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
        admin_signature,
        {
          nonce: admin_nonce_chain1,
        }
      );
      transactionQueueChain1.push(tx);
      admin_nonce_chain1 += 1;
    }
  );

  // Listen for (BurnWETH) event on CHAIN1_CONTRACT
  CHAIN1_CONTRACT.on(
    EVENTS.BURN_WETH,
    async (from, to, amount, token, date, nonce) => {
      console.log(MESSAGES.BURN(1));
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("date: ", date);
      console.log("nonce: ", nonce);
      if (await CHAIN2_CONTRACT.processedNonces(to, nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      let admin_signature = await createSignature(message_type, [
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
      ]);
      console.log({ admin_nonce_chain2 });
      // Unlock the same amount of tokens on chain 2 using the admin private key
      const tx = CHAIN2_CONTRACT.connect(WALLET_CHAIN2).unLockETH(
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
        admin_signature,
        {
          nonce: admin_nonce_chain2,
        }
      );
      transactionQueueChain2.push(tx);
      admin_nonce_chain2 += 1;
    }
  );

  // Listen for (BurnWETH) event on CHAIN2_CONTRACT
  CHAIN2_CONTRACT.on(
    MESSAGES.BURN_WETH,
    async (from, to, amount, token, date, nonce) => {
      console.log(MESSAGES.BURN(2));
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("date: ", date);
      console.log("nonce: ", nonce);
      if (await CHAIN1_CONTRACT.processedNonces(to, nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      let admin_signature = await createSignature(message_type, [
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
      ]);
      console.log({ admin_nonce_chain1 });
      // Unlock the same amount of tokens on chain 1 using the admin private key
      const tx = CHAIN1_CONTRACT.connect(WALLET_CHAIN1).unLockETH(
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
        admin_signature,
        {
          nonce: admin_nonce_chain1,
        }
      );
      transactionQueueChain1.push(tx);
      admin_nonce_chain1 += 1;
    }
  );

  // Process the queue in batches every 15000 milliseconds
  setInterval(async () => {
    await processTransactionQueue();
  }, txProcessInterval);
}

monitorLockEvents().catch((err) => {
  console.log(err);
  process.exit(1);
});
