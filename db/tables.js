const TABLES = {
  TX_QUEUE: "tx_queue",
  TX_FAILED: "tx_failed",
  TX_PROCESSED: "tx_processed",
  // params
  TELEGRAM_LISTENERS: "telegram_listeners",
  PARAMETERS: "parameters",
  CONTRACTS: "contracts",
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
  from_chain: "from_chain",
  to_chain: "to_chain",
  from_chain_id: "from_chain_id",
  to_chain_id: "to_chain_id",
  tx_hash: "tx_hash",
};

module.exports = { TABLES, COLUMNS };
