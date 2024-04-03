const gasLimit = 10000000;
const txProcessInterval = 15000;

const CHAINS = {
  CHAIN_1: 1,
  CHAIN_2: 2,
};

const CHAIN_IDS = {
  C1: 11155111,
  C2: 10395,
};

const PROCESSED = {
  FALSE: 0,
  TRUE: 1,
};

const FUNCTIONS = {
  MINTWETH: "mintWETH",
  MINTTOKEN: "mintToken",
  UNLOCKTOKEN: "unlockToken",
  UNLOCKETH: "unLockETH",
};

module.exports = {
  gasLimit,
  txProcessInterval,
  CHAINS,
  PROCESSED,
  FUNCTIONS,
  CHAIN_IDS,
};
