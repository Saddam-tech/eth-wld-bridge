const { ethers, run, network } = require("hardhat");

const contract = "EthereumBridge";

async function main() {
  const MyContractFactory = await ethers.getContractFactory(contract);
  console.log("Deploying contract...");
  const MyContract = await MyContractFactory.deploy();
  await MyContract.deployed();
  // if (network.config.chainId === 5 && process.env.ETHERSCAN_API_KEY) {
  //   console.log("Waiting for block txes...");
  //   await MyContract.deployTransaction.wait(6);
  //   await verify(simpleStorage.address, []);
  // }

  const lockTokens = await MyContract.lockTokens(
    "0x210706cbd9D26c26c727f4d3007D819390934375",
    "1000000000000000000",
    "GoerliETH",
    "0x956679f83E826DCCe302fb5f443D4b42f2A729E9"
  );

  console.log({ lockTokens });
}

async function verify() {}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
