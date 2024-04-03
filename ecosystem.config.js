module.exports = {
  apps: [
    {
      name: "eth-wld-bridge",
      script: "yarn watch--prod",
    },
    {
      name: "set-network-fee",
      script: "node scripts/setNetworkFee.js",
    },
  ],
};
