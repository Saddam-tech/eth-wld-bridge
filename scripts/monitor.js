const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: BRIDGE_ABI,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const {
  map_token_address_to_token_address,
  createSignature,
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
  // Listen for the Lock event on the CHAIN_1_CONTRACT
  let admin_nonce_chain1 = await WALLET_CHAIN_1.getTransactionCount();
  let admin_nonce_chain2 = await WALLET_CHAIN_2.getTransactionCount();
  CHAIN_1_CONTRACT.on(
    "TransferToken",
    async (from, to, amount, token, timestamp, tokenType, nonce) => {
      console.log(
        `<<<<<<<<<< TransferToken event detected on CHAIN_1 >>>>>>>>>>>`
      );
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("token_name: ", tokenType);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      let admin_signature = await createSignature(
        ["address", "uint256", "address", "uint256"],
        [to, amount, map_token_address_to_token_address[token], nonce]
      );
      console.log({ admin_nonce_chain2 });
      // Check if the same transaction is being executed the second time
      if (await CHAIN_2_CONTRACT.processedNonces(to, nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
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
      admin_nonce_chain2 += 1;
    }
  );

  // Listen for the Lock event on the CHAIN_2_CONTRACT
  CHAIN_2_CONTRACT.on(
    "TransferToken",
    async (from, to, amount, token, timestamp, tokenType, nonce) => {
      console.log(
        `<<<<<<<<<< TransferToken event detected on CHAIN_2 >>>>>>>>>>>`
      );
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("token_name: ", tokenType);
      console.log("nonce: ", nonce);
      let admin_signature = await createSignature(
        ["address", "uint256", "address", "uint256"],
        [to, amount, map_token_address_to_token_address[token], nonce]
      );
      console.log({ admin_nonce_chain1 });
      // Check if the same transaction is being executed the second time
      if (await CHAIN_1_CONTRACT.processedNonces(to, nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
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
        console.log(
          `Requested more than the existing balance on chain_1. Requested amount: ${_amount}, User balance: ${chain1_user_balance}`
        );
        console.log("Reverting the action...");
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
      admin_nonce_chain1 += 1;
    }
  );

  // BRIDGING WETH

  // Listen for the (LockETH) event on the CHAIN_1_CONTRACT

  CHAIN_1_CONTRACT.on(
    "LockETH",
    async (from, to, amount, token, date, nonce) => {
      console.log(`<<<<<<<<<< ETH LOCK event detected on CHAIN_1 >>>>>>>>>>>`);
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("date: ", date);
      console.log("nonce: ", nonce);
      // Check if the same transaction is being executed the second time
      if (await CHAIN_2_CONTRACT.processedNonces(to, nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
        return;
      }
      let admin_signature = await createSignature(
        ["address", "uint256", "address", "uint256"],
        [to, amount, map_token_address_to_token_address[token], nonce]
      );
      console.log({ admin_nonce_chain2 });
      // Mint the same amount of tokens on chain 2 using the admin private key
      const tx = CHAIN_2_CONTRACT.connect(WALLET_CHAIN_2).mintWETH(
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
  // Listen for (LockETH) event on CHAIN_2_CONTRACT
  CHAIN_2_CONTRACT.on(
    "LockETH",
    async (from, to, amount, token, date, nonce) => {
      console.log(`<<<<<<<<<< ETH LOCK event detected on CHAIN_2 >>>>>>>>>>>`);
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("date: ", date);
      console.log("nonce: ", nonce);
      if (await CHAIN_1_CONTRACT.processedNonces(to, nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
        return;
      }
      let admin_signature = await createSignature(
        ["address", "uint256", "address", "uint256"],
        [to, amount, map_token_address_to_token_address[token], nonce]
      );
      console.log({ admin_nonce_chain1 });
      // Unlock the same amount of tokens on chain 1 using the admin private key
      const tx = CHAIN_1_CONTRACT.connect(WALLET_CHAIN_1).mintWETH(
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

  // Listen for (BurnWETH) event on CHAIN_1_CONTRACT
  CHAIN_1_CONTRACT.on(
    "BurnWETH",
    async (from, to, amount, token, date, nonce) => {
      console.log(`<<<<<<<<<< BurnWETH event detected on CHAIN_1 >>>>>>>>>>>`);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("date: ", date);
      console.log("nonce: ", nonce);
      if (await CHAIN_2_CONTRACT.processedNonces(to, nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
        return;
      }
      let admin_signature = await createSignature(
        ["address", "uint256", "address", "uint256"],
        [to, amount, map_token_address_to_token_address[token], nonce]
      );
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
      admin_nonce_chain2 += 1;
    }
  );

  // Listen for (BurnWETH) event on CHAIN_2_CONTRACT
  CHAIN_2_CONTRACT.on(
    "BurnWETH",
    async (from, to, amount, token, date, nonce) => {
      console.log(`<<<<<<<<<< BurnWETH event detected on CHAIN_2 >>>>>>>>>>>`);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("date: ", date);
      console.log("nonce: ", nonce);
      if (await CHAIN_1_CONTRACT.processedNonces(to, nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
        return;
      }
      let admin_signature = await createSignature(
        ["address", "uint256", "address", "uint256"],
        [to, amount, map_token_address_to_token_address[token], nonce]
      );
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
      admin_nonce_chain1 += 1;
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
