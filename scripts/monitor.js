const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: BRIDGE_ABI,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const {
  map_token_address_to_token_address,
  createSignature,
  message_type,
} = require("../configs/util");
const { gasLimit, txProcessInterval } = require("../configs/constants");
const { MESSAGES } = require("../configs/messages");
const { EVENTS } = require("../configs/events");

// const encryptedJson = fs.readFileSync("./.encryptedKey.json", "utf8");
// const encryptedPk = new ethers.Wallet.fromEncryptedJsonSync(
//   encryptedJson,
//   process.env.PRIVATE_KEY_PW
// );
const CHAIN_1_BRIDGE_ADDRESS = process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;
const CHAIN_2_BRIDGE_ADDRESS = process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;
const CHAIN_1_PROVIDER = new ethers.providers.JsonRpcProvider(
  process.env.local_provider_chain_1
);
const CHAIN_2_PROVIDER = new ethers.providers.JsonRpcProvider(
  process.env.local_provider_chain_2
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
const WALLET_CHAIN_1 = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  CHAIN_1_PROVIDER
);
const WALLET_CHAIN_2 = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  CHAIN_2_PROVIDER
);
const transactionQueueChain1 = [];
const transactionQueueChain2 = [];

async function processTransactionQueue() {
  try {
    // chain1 execution
    if (transactionQueueChain1.length > 0) {
      const destinations = [];
      const amounts = [];
      const nonces = [];
      let token;
      for (let i = 0; i < transactionQueueChain1.length; i++) {
        destinations.push(transactionQueueChain1[i].to);
        amounts.push(transactionQueueChain1[i].amount);
        nonces.push(transactionQueueChain1[i].nonce);
        token =
          map_token_address_to_token_address[transactionQueueChain1[i].token];
      }
      const admin_signature = await createSignature(message_type, [token]);
      const tx = await CHAIN_1_CONTRACT.connect(WALLET_CHAIN_1).mintWETH(
        destinations,
        amounts,
        nonces,
        map_token_address_to_token_address[token],
        admin_signature
      );
      console.log({ tx });
      console.log(MESSAGES.BATCH_PROCESSED(1, destinations.length));
      destinations = [];
      amounts = [];
      nonces = [];
    } else {
      console.log(MESSAGES.NO_TX(1));
    }

    // chain2 execution
    if (transactionQueueChain2.length > 0) {
      const destinations = [];
      const amounts = [];
      const nonces = [];
      let token;
      for (let i = 0; i < transactionQueueChain2.length; i++) {
        destinations.push(transactionQueueChain2[i].to);
        amounts.push(transactionQueueChain2[i].amount);
        nonces.push(transactionQueueChain2[i].nonce);
        token =
          map_token_address_to_token_address[transactionQueueChain2[i].token];
      }
      const admin_signature = await createSignature(message_type, [token]);
      const tx = await CHAIN_2_CONTRACT.connect(WALLET_CHAIN_2).mintWETH(
        destinations,
        amounts,
        nonces,
        map_token_address_to_token_address[token],
        admin_signature
      );
      console.log({ tx });
      console.log(MESSAGES.BATCH_PROCESSED(1, destinations.length));
      destinations = [];
      amounts = [];
      nonces = [];
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
  // Listen for the Lock event on the CHAIN_1_CONTRACT
  CHAIN_1_CONTRACT.on(
    EVENTS.TRANSFER_TOKEN,
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
      let admin_signature = await createSignature(message_type, [
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
      ]);
      const admin_nonce_chain2 = await WALLET_CHAIN_2.getTransactionCount();
      console.log({ admin_nonce_chain2 });
      // Check if the same transaction is being executed the second time
      if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      // Mint the same amount of tokens on chain 2 using the admin private key
      const tx = CHAIN_2_CONTRACT.connect(WALLET_CHAIN_2).mintToken(
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
    }
  );

  // Listen for the Lock event on the CHAIN_2_CONTRACT
  CHAIN_2_CONTRACT.on(
    EVENTS.TRANSFER_TOKEN,
    async (from, to, amount, token, timestamp, tokenType, nonce) => {
      console.log(MESSAGES.TOKEN_TRANSFER(2));
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
      const admin_nonce_chain1 = await WALLET_CHAIN_1.getTransactionCount();
      console.log({ admin_nonce_chain1 });
      // Check if the same transaction is being executed the second time
      if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      // Check if the balance of user is enough
      let _amount = ethers.utils.formatEther(amount);
      let chain1_user_balance = ethers.utils.formatEther(
        await CHAIN_1_CONTRACT.userBalances(
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
      const tx = CHAIN_1_CONTRACT.connect(WALLET_CHAIN_1).unlockToken(
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
    }
  );

  // BRIDGING WETH

  // Listen for the (LockETH) event on the CHAIN_1_CONTRACT
  CHAIN_1_CONTRACT.on(
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
      if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      transactionQueueChain2.push({ from, to, amount, nonce, token, date });
    }
  );
  // Listen for (LockETH) event on CHAIN_2_CONTRACT
  CHAIN_2_CONTRACT.on(
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
      if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      transactionQueueChain1.push({ from, to, amount, nonce, token, date });
    }
  );

  // Listen for (BurnWETH) event on CHAIN_1_CONTRACT
  CHAIN_1_CONTRACT.on(
    EVENTS.BURN_WETH,
    async (from, to, amount, token, date, nonce) => {
      console.log(MESSAGES.BURN(1));
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("date: ", date);
      console.log("nonce: ", nonce);
      if (await CHAIN_2_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      let admin_signature = await createSignature(message_type, [
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
      ]);
      const admin_nonce_chain2 = await WALLET_CHAIN_2.getTransactionCount();
      console.log({ admin_nonce_chain2 });
      // Unlock the same amount of tokens on chain 2 using the admin private key
      const tx = CHAIN_2_CONTRACT.connect(WALLET_CHAIN_2).unLockETH(
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
    }
  );

  // Listen for (BurnWETH) event on CHAIN_2_CONTRACT
  CHAIN_2_CONTRACT.on(
    EVENTS.BURN_WETH,
    async (from, to, amount, token, date, nonce) => {
      console.log(MESSAGES.BURN(2));
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("date: ", date);
      console.log("nonce: ", nonce);
      if (await CHAIN_1_CONTRACT.processedNonces(nonce)) {
        console.log(MESSAGES.ALREADY_PROCESSED);
        return;
      }
      let admin_signature = await createSignature(message_type, [
        to,
        amount,
        map_token_address_to_token_address[token],
        nonce,
      ]);
      const admin_nonce_chain1 = await WALLET_CHAIN_1.getTransactionCount();
      console.log({ admin_nonce_chain1 });
      // Unlock the same amount of tokens on chain 1 using the admin private key
      const tx = CHAIN_1_CONTRACT.connect(WALLET_CHAIN_1).unLockETH(
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
    }
  );

  // Process the queue in batches every 15 secs
  setInterval(async () => {
    await processTransactionQueue();
  }, txProcessInterval);
}

monitorLockEvents().catch((err) => {
  console.log(err);
  process.exit(1);
});
