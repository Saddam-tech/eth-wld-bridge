const MESSAGES = {
  WELCOME: (name) =>
    `Welcome ${
      name ?? "Worldlander"
    } 😃. I am a bot that notifies of incoming calls to Worldland Bridge!`,
  INIT: "Started monitoring chains [1, 2] for Lock transactions...",
  TOKEN_TRANSFER: (chain) => `TransferToken event detected on CHAIN_${chain}`,
  ETH_TRANSFER: (chain) => `ETH LOCK event detected on CHAIN_${chain}`,
  BURN: (chain) => `BurnWETH event detected on CHAIN_${chain}`,
  BATCH_PROCESSED: (chain, num) =>
    `Processed ${num} transactions in batch on chain ${chain}!`,
  TX_FAILED: (chain) => `Failed to process the transaction on chain ${chain}`,
  NO_TX: (chain) => `No transactions to process on chain ${chain}.`,
  ALREADY_PROCESSED:
    "Skipping already processed transaction... Waiting for upcoming transactions...",
  ALREADY_QUEUED:
    "Transaction has already been included in the queue! Skipping this call... Loading the queue from db...",
  LOW_BALANCE: (amount, balance) =>
    `Requested more than the existing balance on chain_1. Requested amount: ${amount}, User balance: ${balance}`,
  REVERT_ACTION: "Reverting the action...",
  DB_CONNECT: "Connected to the SQlite database!",
  DB_CLOSE: "Closing the database connection...",
};

module.exports = { MESSAGES };
