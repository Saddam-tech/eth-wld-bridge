module.exports = {
  apps: [
    {
      name: "eth-wld-bridge",
      script: "yarn publisher--prod",
    },
    {
      name: "eth-wld-bridge",
      script: "yarn consumer--prod",
    },
    // {
    //   name: "set-network-fee",
    //   script: "node scripts/setNetworkFee.js",
    // },
  ],
};
