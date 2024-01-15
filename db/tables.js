const TABLES = {
  TX_QUEUE: "tx_queue",
  TX_FAILED: "tx_failed",
  TX_PROCESSED: "tx_processed",
};

const COLUMNS = {
  from_address: "from_address",
  to_address: "to_address",
  amount: "amount",
  nonce: "nonce",
  token: "token",
  timestamp: "timestamp",
  chain: "chain",
  processed: "processed",
  function_type: "function_type",
};

module.exports = { TABLES, COLUMNS };
