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
} = require("../configs/util");
const { gasLimit, txProcessInterval } = require("../configs/constants");
const { MESSAGES } = require("../configs/messages");
const { EVENTS } = require("../configs/events");

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
const WALLET_CHAIN_1 = new ethers.Wallet(
  process.env.encryptedPk,
  CHAIN_1_PROVIDER
);
const WALLET_CHAIN_2 = new ethers.Wallet(
  process.env.encryptedPk,
  CHAIN_2_PROVIDER
);
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

async function processTransactionQueue() {
  try {
    // chain1 mintWETH batch submission
    if (mintWETHTxQueueChain1.length > 0) {
      let destinations = [];
      let amounts = [];
      let nonces = [];
      let token;
      for (let i = 0; i < mintWETHTxQueueChain1.length; i++) {
        if (!mintWETHTxQueueChain1[i].processed) {
          destinations.push(mintWETHTxQueueChain1[i].to);
          amounts.push(mintWETHTxQueueChain1[i].amount);
          nonces.push(mintWETHTxQueueChain1[i].nonce);
          token =
            map_token_address_to_token_address[mintWETHTxQueueChain1[i].token];
          mintWETHTxQueueChain1[i].processed = true;
          console.log(mintWETHTxQueueChain1[i]);
        }
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
      mintWETHTxQueueChain1 = mintWETHTxQueueChain1.filter(
        (el) => el.processed === false
      );
      destinations = [];
      amounts = [];
      nonces = [];
    } else {
      console.log(MESSAGES.NO_TX(1));
    }

    // chain2 mintWETH batch submission
    if (mintWETHTxQueueChain2.length > 0) {
      let destinations = [];
      let amounts = [];
      let nonces = [];
      let token;
      for (let i = 0; i < mintWETHTxQueueChain2.length; i++) {
        destinations.push(mintWETHTxQueueChain2[i].to);
        amounts.push(mintWETHTxQueueChain2[i].amount);
        nonces.push(mintWETHTxQueueChain2[i].nonce);
        token =
          map_token_address_to_token_address[mintWETHTxQueueChain2[i].token];
        mintWETHTxQueueChain2[i].processed = true;
        console.log(mintWETHTxQueueChain2[i]);
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
      console.log(MESSAGES.BATCH_PROCESSED(2, destinations.length));
      mintWETHTxQueueChain2 = mintWETHTxQueueChain2.filter(
        (el) => el.processed === false
      );
      destinations = [];
      amounts = [];
      nonces = [];
    } else {
      console.log(MESSAGES.NO_TX(2));
    }

    // chain1 unLockETH batch submission
    if (unLockETHTxQueueChain1.length > 0) {
      let destinations = [];
      let amounts = [];
      let nonces = [];
      let token;
      for (let i = 0; i < unLockETHTxQueueChain1.length; i++) {
        destinations.push(unLockETHTxQueueChain1[i].to);
        amounts.push(unLockETHTxQueueChain1[i].amount);
        nonces.push(unLockETHTxQueueChain1[i].nonce);
        token =
          map_token_address_to_token_address[unLockETHTxQueueChain1[i].token];
        unLockETHTxQueueChain1[i].processed = true;
        console.log(unLockETHTxQueueChain1[i]);
      }
      const admin_signature = await createSignature(message_type, [token]);
      const tx = await CHAIN_1_CONTRACT.connect(WALLET_CHAIN_1).unLockETH(
        destinations,
        amounts,
        nonces,
        map_token_address_to_token_address[token],
        admin_signature
      );
      console.log({ tx });
      console.log(MESSAGES.BATCH_PROCESSED(1, destinations.length));
      unLockETHTxQueueChain1 = unLockETHTxQueueChain1.filter(
        (el) => el.processed === false
      );
      destinations = [];
      amounts = [];
      nonces = [];
    } else {
      console.log(MESSAGES.NO_TX(1));
    }

    // chain2 unLockETH batch submission
    if (unLockETHTxQueueChain2.length > 0) {
      let destinations = [];
      let amounts = [];
      let nonces = [];
      let token;
      for (let i = 0; i < unLockETHTxQueueChain2.length; i++) {
        destinations.push(unLockETHTxQueueChain2[i].to);
        amounts.push(unLockETHTxQueueChain2[i].amount);
        nonces.push(unLockETHTxQueueChain2[i].nonce);
        token =
          map_token_address_to_token_address[unLockETHTxQueueChain2[i].token];
        unLockETHTxQueueChain2[i].processed = true;
        console.log(unLockETHTxQueueChain2[i]);
      }
      const admin_signature = await createSignature(message_type, [token]);
      const tx = await CHAIN_1_CONTRACT.connect(WALLET_CHAIN_1).unLockETH(
        destinations,
        amounts,
        nonces,
        map_token_address_to_token_address[token],
        admin_signature
      );
      console.log({ tx });
      console.log(MESSAGES.BATCH_PROCESSED(2, destinations.length));
      unLockETHTxQueueChain2 = unLockETHTxQueueChain2.filter(
        (el) => el.processed === false
      );
      destinations = [];
      amounts = [];
      nonces = [];
    } else {
      console.log(MESSAGES.NO_TX(2));
    }

    // chain1 mintToken batch submission
    if (mintTokenTxQueueChain1.length > 0) {
      let destinations = [];
      let amounts = [];
      let nonces = [];
      let token;
      for (let i = 0; i < mintTokenTxQueueChain1.length; i++) {
        if (!mintTokenTxQueueChain1[i].processed) {
          destinations.push(mintTokenTxQueueChain1[i].to);
          amounts.push(mintTokenTxQueueChain1[i].amount);
          nonces.push(mintTokenTxQueueChain1[i].nonce);
          token =
            map_token_address_to_token_address[mintTokenTxQueueChain1[i].token];
          mintTokenTxQueueChain1[i].processed = true;
          console.log(mintTokenTxQueueChain1[i]);
        }
      }
      const admin_signature = await createSignature(message_type, [token]);
      const tx = await CHAIN_1_CONTRACT.connect(WALLET_CHAIN_1).mintToken(
        destinations,
        amounts,
        nonces,
        map_token_address_to_token_address[token],
        admin_signature
      );
      console.log({ tx });
      console.log(MESSAGES.BATCH_PROCESSED(1, destinations.length));
      mintTokenTxQueueChain1 = mintTokenTxQueueChain1.filter(
        (el) => el.processed === false
      );
      destinations = [];
      amounts = [];
      nonces = [];
    } else {
      console.log(MESSAGES.NO_TX(1));
    }

    // chain2 mintToken batch submission
    if (mintTokenTxQueueChain2.length > 0) {
      let destinations = [];
      let amounts = [];
      let nonces = [];
      let token;
      for (let i = 0; i < mintTokenTxQueueChain2.length; i++) {
        destinations.push(mintTokenTxQueueChain2[i].to);
        amounts.push(mintTokenTxQueueChain2[i].amount);
        nonces.push(mintTokenTxQueueChain2[i].nonce);
        token =
          map_token_address_to_token_address[mintTokenTxQueueChain2[i].token];
        mintTokenTxQueueChain2[i].processed = true;
        console.log(mintTokenTxQueueChain2[i]);
      }
      const admin_signature = await createSignature(message_type, [token]);
      const tx = await CHAIN_2_CONTRACT.connect(WALLET_CHAIN_2).mintToken(
        destinations,
        amounts,
        nonces,
        map_token_address_to_token_address[token],
        admin_signature
      );
      console.log({ tx });
      console.log(MESSAGES.BATCH_PROCESSED(2, destinations.length));
      mintTokenTxQueueChain2 = mintTokenTxQueueChain2.filter(
        (el) => el.processed === false
      );
      destinations = [];
      amounts = [];
      nonces = [];
    } else {
      console.log(MESSAGES.NO_TX(2));
    }

    // chain1 unlockToken batch submission
    if (unlockTokenTxQueueChain1.length > 0) {
      let destinations = [];
      let amounts = [];
      let nonces = [];
      let token;
      for (let i = 0; i < unlockTokenTxQueueChain1.length; i++) {
        destinations.push(unlockTokenTxQueueChain1[i].to);
        amounts.push(unlockTokenTxQueueChain1[i].amount);
        nonces.push(unlockTokenTxQueueChain1[i].nonce);
        token =
          map_token_address_to_token_address[unlockTokenTxQueueChain1[i].token];
        unlockTokenTxQueueChain1[i].processed = true;
        console.log(unlockTokenTxQueueChain1[i]);
      }
      const admin_signature = await createSignature(message_type, [token]);
      const tx = await CHAIN_1_CONTRACT.connect(WALLET_CHAIN_1).unlockToken(
        destinations,
        amounts,
        nonces,
        map_token_address_to_token_address[token],
        admin_signature
      );
      console.log({ tx });
      console.log(MESSAGES.BATCH_PROCESSED(1, destinations.length));
      unlockTokenTxQueueChain1 = unlockTokenTxQueueChain1.filter(
        (el) => el.processed === false
      );
      destinations = [];
      amounts = [];
      nonces = [];
    } else {
      console.log(MESSAGES.NO_TX(1));
    }

    // chain2 unlockToken batch submission
    if (unlockTokenTxQueueChain2.length > 0) {
      let destinations = [];
      let amounts = [];
      let nonces = [];
      let token;
      for (let i = 0; i < unlockTokenTxQueueChain2.length; i++) {
        destinations.push(unlockTokenTxQueueChain2[i].to);
        amounts.push(unlockTokenTxQueueChain2[i].amount);
        nonces.push(unlockTokenTxQueueChain2[i].nonce);
        token =
          map_token_address_to_token_address[unlockTokenTxQueueChain2[i].token];
        unlockTokenTxQueueChain2[i].processed = true;
        console.log(unlockTokenTxQueueChain2[i]);
      }
      const admin_signature = await createSignature(message_type, [token]);
      const tx = await CHAIN_1_CONTRACT.connect(WALLET_CHAIN_1).unlockToken(
        destinations,
        amounts,
        nonces,
        map_token_address_to_token_address[token],
        admin_signature
      );
      console.log({ tx });
      console.log(MESSAGES.BATCH_PROCESSED(2, destinations.length));
      unlockTokenTxQueueChain2 = unlockTokenTxQueueChain2.filter(
        (el) => el.processed === false
      );
      destinations = [];
      amounts = [];
      nonces = [];
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
      mintTokenTxQueueChain2.push({
        from,
        to,
        amount,
        nonce,
        token,
        timestamp,
        processed: false,
      });
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
      mintTokenTxQueueChain1.push({
        from,
        to,
        amount,
        nonce,
        token,
        timestamp,
        processed: false,
      });
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
      unlockTokenTxQueueChain2.push({
        from,
        to,
        amount,
        nonce,
        token,
        timestamp,
        processed: false,
      });
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
      unlockTokenTxQueueChain1.push({
        from,
        to,
        amount,
        nonce,
        token,
        timestamp,
        processed: false,
      });
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
      mintWETHTxQueueChain2.push({
        from,
        to,
        amount,
        nonce,
        token,
        date,
        processed: false,
      });
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
      mintWETHTxQueueChain1.push({
        from,
        to,
        amount,
        nonce,
        token,
        date,
        processed: false,
      });
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
      unLockETHTxQueueChain2.push({
        from,
        to,
        amount,
        nonce,
        token,
        date,
        processed: false,
      });
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
      unLockETHTxQueueChain1.push({
        from,
        to,
        amount,
        nonce,
        token,
        date,
        processed: false,
      });
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
