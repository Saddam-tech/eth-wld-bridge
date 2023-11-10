const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: ethereum_bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const {
  abi: wld_bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const {
  map_token_address_to_token_address,
  createSignature,
} = require("./util");

// const encryptedJson = fs.readFileSync("./.encryptedKey.json", "utf8");
// const encryptedPk = new ethers.Wallet.fromEncryptedJsonSync(
//   encryptedJson,
//   process.env.PRIVATE_KEY_PW
// );

// Specify the lock contract addresses and ABIs for both chains
const chain_1_bridge_contract_address =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;
const chain_2_bridge_contract_address =
  process.env.WORLDLAND_BRIDGE_CONTRACT_ADDRESS;

// Connect to both chains using the JsonRpcProvider class
const chain1Provider = new ethers.providers.JsonRpcProvider(
  process.env.local_provider_chain_1
);
const chain2Provider = new ethers.providers.JsonRpcProvider(
  process.env.local_provider_chain_2
);

// Create Contract instances for the lock contracts on both chains
const chain_1_contract = new ethers.Contract(
  chain_1_bridge_contract_address,
  ethereum_bridge_abi,
  chain1Provider,
  { gasLimit: 100000 }
);

const chain_2_contract = new ethers.Contract(
  chain_2_bridge_contract_address,
  wld_bridge_abi,
  chain2Provider,
  { gasLimit: 100000 }
);
// Get a wallet using the admin private key
const wallet_chain_1 = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  chain1Provider
);
const wallet_chain_2 = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  chain2Provider
);

const batchSize = 5;

const transactionQueueChain1 = [];
const transactionQueueChain2 = [];

async function processTransactionQueue() {
  try {
    const transactions1 = transactionQueueChain1.splice(0, batchSize);
    const transactions2 = transactionQueueChain2.splice(0, batchSize);

    // chain1 execution
    if (transactions1.length > 0) {
      console.log(
        `Processing ${transactions1.length} transactions in batch...`
      );
      const batch1 = new ethers.utils.BatchRequest(chain1Provider);
      transactions1.forEach((tx) => {
        batch1.add(tx);
        transactionQueueChain1.shift();
      });
      const responses_1 = await batch1.execute();
      console.log({ responses_1 });
      console.log(`Transactions batch executed on chain 1!`);
    } else {
      console.log("No transactions to process on chain 1.");
    }

    // chain2 execution
    if (transactions2.length > 0) {
      console.log(
        `Processing ${transactions2.length} transactions in batch...`
      );
      const batch2 = new ethers.utils.BatchRequest(chain2Provider);
      transactions2.forEach((tx) => {
        batch2.add(tx);
        transactionQueueChain2.shift();
      });
      const responses_2 = await batch2.execute();
      console.log({ responses_2 });
      console.log(`Transactions batch executed on chain 2!`);
    } else {
      console.log("No transactions to process on chain 2.");
    }
  } catch (err) {
    console.log(err);
  }
}

async function monitorLockEvents() {
  console.log("Started monitoring chains [1, 2] for Lock transactions...");
  // Listen for the Lock event on the chain_1_contract
  chain_1_contract.on(
    "TransferToken",
    async (from, to, amount, token, timestamp, tokenType, nonce) => {
      console.log(
        `<<<<<<<<<< TransferToken event detected on CHAIN_1 >>>>>>>>>>>`
      );
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("token: ", token);
      console.log("token_name: ", tokenType);
      console.log("timestamp: ", timestamp);
      console.log("nonce: ", nonce);
      let admin_signature = await createSignature(
        ["address", "uint256", "address", "uint256"],
        [to, amount, map_token_address_to_token_address[token], nonce]
      );
      // Check if the same transaction is being executed the second time
      if (await chain_2_contract.processedNonces(to, nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
        return;
      }
      // Mint the same amount of tokens on chain 2 using the admin private key
      const tx = chain_2_contract
        .connect(wallet_chain_2)
        .mintToken(
          to,
          amount,
          map_token_address_to_token_address[token],
          nonce,
          admin_signature
        );
      transactionQueueChain2.push(tx);

      // Process the queue in batches
      if (transactionQueueChain2.length >= batchSize) {
        await processTransactionQueue();
      }
    }
  );

  // Listen for the Lock event on the chain_2_contract
  chain_2_contract.on(
    "TransferToken",
    async (from, to, amount, token, timestamp, tokenType, nonce) => {
      console.log(
        `<<<<<<<<<< TransferToken event detected on CHAIN_2 >>>>>>>>>>>`
      );
      console.log("from: ", from);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("token: ", token);
      console.log("token_name: ", tokenType);
      console.log("nonce: ", nonce);
      let admin_signature = await createSignature(
        ["address", "uint256", "address", "uint256"],
        [to, amount, map_token_address_to_token_address[token], nonce]
      );
      // Check if the same transaction is being executed the second time
      if (await chain_1_contract.processedNonces(to, nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
        return;
      }
      // THIS HAS TO BE COMPLETED
      // Check if the balance of user is enough
      let _amount = ethers.utils.formatEther(amount);
      let chain1_user_balance = ethers.utils.formatEther(
        await chain_1_contract.userBalances(
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
      const tx = chain_1_contract
        .connect(wallet_chain_1)
        .unlockToken(
          to,
          amount,
          map_token_address_to_token_address[token],
          nonce,
          admin_signature
        );
      transactionQueueChain1.push(tx);

      // Process the queue in batches
      if (transactionQueueChain1.length >= batchSize) {
        await processTransactionQueue();
      }
    }
  );

  // BRIDGING WETH

  // Listen for the (LockETH) event on the chain_1_contract

  chain_1_contract.on(
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
      if (await chain_2_contract.processedNonces(to, nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
        return;
      }
      let admin_signature = await createSignature(
        ["address", "uint256", "address", "uint256"],
        [to, amount, map_token_address_to_token_address[token], nonce]
      );
      // Mint the same amount of tokens on chain 2 using the admin private key
      const tx = chain_2_contract
        .connect(wallet_chain_2)
        .mintWETH(
          to,
          amount,
          map_token_address_to_token_address[token],
          nonce,
          admin_signature
        );
      transactionQueueChain2.push(tx);

      // Process the queue in batches
      if (transactionQueueChain2.length >= batchSize) {
        await processTransactionQueue();
      }
    }
  );
  // Listen for (LockETH) event on chain_2_contract
  chain_2_contract.on(
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
      if (await chain_1_contract.processedNonces(to, nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
        return;
      }
      let admin_signature = await createSignature(
        ["address", "uint256", "address", "uint256"],
        [to, amount, map_token_address_to_token_address[token], nonce]
      );
      // Unlock the same amount of tokens on chain 1 using the admin private key
      const tx = chain_1_contract
        .connect(wallet_chain_1)
        .mintWETH(
          to,
          amount,
          map_token_address_to_token_address[token],
          nonce,
          admin_signature
        );
      transactionQueueChain1.push(tx);

      // Process the queue in batches
      if (transactionQueueChain1.length >= batchSize) {
        await processTransactionQueue();
      }
    }
  );

  // Listen for (BurnWETH) event on chain_1_contract
  chain_1_contract.on(
    "BurnWETH",
    async (from, to, amount, token, date, nonce) => {
      console.log(`<<<<<<<<<< BurnWETH event detected on CHAIN_1 >>>>>>>>>>>`);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", token);
      console.log("chain2token: ", map_token_address_to_token_address[token]);
      console.log("date: ", date);
      console.log("nonce: ", nonce);
      if (await chain_2_contract.processedNonces(to, nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
        return;
      }
      let admin_signature = await createSignature(
        ["address", "uint256", "address", "uint256"],
        [to, amount, map_token_address_to_token_address[token], nonce]
      );
      // Unlock the same amount of tokens on chain 2 using the admin private key
      const tx = chain_2_contract
        .connect(wallet_chain_2)
        .unLockETH(
          to,
          amount,
          map_token_address_to_token_address[token],
          nonce,
          admin_signature
        );
      transactionQueueChain2.push(tx);

      // Process the queue in batches
      if (transactionQueueChain2.length >= batchSize) {
        await processTransactionQueue();
      }
    }
  );

  // Listen for (BurnWETH) event on chain_2_contract
  chain_2_contract.on(
    "BurnWETH",
    async (from, to, amount, token, date, nonce) => {
      console.log(`<<<<<<<<<< BurnWETH event detected on CHAIN_2 >>>>>>>>>>>`);
      console.log("to: ", to);
      console.log("amount: ", ethers.utils.formatEther(amount));
      console.log("chain1token: ", map_token_address_to_token_address[token]);
      console.log("chain2token: ", token);
      console.log("date: ", date);
      console.log("nonce: ", nonce);
      if (await chain_1_contract.processedNonces(to, nonce)) {
        console.log(
          "Skipping already processed transaction... Waiting for upcoming transactions..."
        );
        return;
      }
      let admin_signature = await createSignature(
        ["address", "uint256", "address", "uint256"],
        [to, amount, map_token_address_to_token_address[token], nonce]
      );
      // Unlock the same amount of tokens on chain 1 using the admin private key
      const tx = chain_1_contract
        .connect(wallet_chain_1)
        .unLockETH(
          to,
          amount,
          map_token_address_to_token_address[token],
          nonce,
          admin_signature
        );
      transactionQueueChain1.push(tx);

      // Process the queue in batches
      if (transactionQueueChain1.length >= batchSize) {
        await processTransactionQueue();
      }
    }
  );
}

monitorLockEvents().catch((err) => {
  console.log(err);
  process.exit(1);
});
