const { ethers } = require("hardhat");
require("dotenv").config();

const {
  abi: bridge_abi,
} = require("../artifacts/contracts/BridgeBase.sol/BridgeBase.json");
const { abi: weth_abi } = require("../artifacts/contracts/WETH.sol/WETH.json");
const {
  abi: erc20_abi,
} = require("../artifacts/contracts/ERC20Custom.sol/ERC20Custom.json");
const { createSignature } = require("./util");

async function main() {
  console.log("Deploying contracts...");
  const bridge = await ethers.getContractFactory("BridgeBase");
  const WETH = await ethers.getContractFactory("WETH");
  const ERC20Custom = await ethers.getContractFactory("ERC20Custom");
  const _bridge = await bridge.deploy();
  const _WETH = await WETH.deploy("Wrapped Ether", "WETH");
  const _ERC20Custom = await ERC20Custom.deploy("Dai", "DAI");
  await _bridge.deployed();
  await _WETH.deployed();
  await _ERC20Custom.deployed();
  const signer = await ethers.getSigner();
  const weth_contract = new ethers.Contract(_WETH.address, weth_abi, signer);
  const erc20_contract = new ethers.Contract(
    _ERC20Custom.address,
    erc20_abi,
    signer
  );
  await weth_contract.approve(
    _bridge.address,
    ethers.utils.parseUnits("10000000000", 18)
  );
  await erc20_contract.approve(
    _bridge.address,
    ethers.utils.parseUnits("10000000000", 18)
  );
  const nonce = signer.getTransactionCount();
  await erc20_contract.mintToken(
    signer.address,
    ethers.utils.parseUnits("10000000000", 18),
    _ERC20Custom.address,
    nonce,
    createSignature(
      ["address", "uint256", "address", "uint256"],
      signer.address,
      ethers.utils.parseUnits("10000000000", 18),
      _ERC20Custom.address,
      nonce
    )
  );
  await weth_contract.transferOwnership(_bridge.address);
  await erc20_contract.transferOwnership(_bridge.address);
  console.log(`Bridge contract: ${_bridge.address}`);
  console.log(`Wrapped Ether contract: ${_WETH.address}`);
  console.log(`ERC20 contract: ${_ERC20Custom.address}`);
  console.log("Approved all contracts to BridgeBase!");
  console.log("Ownership of WETH and ERC20 token transfered to BridgeBase!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
