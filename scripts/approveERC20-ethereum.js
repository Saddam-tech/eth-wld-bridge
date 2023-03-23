const { ethers } = require("hardhat");
require("dotenv").config();

const abi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];
const ABI_ETHEREUM_BRIDGE = [
  "function lockTokens(address to, uint256 amount, string calldata tokenType, address token) external returns (void)",
  "function unlockTokens(address to, uint256 amount, address token, uint256 otherChainNonce) external returns (void)",
];

const ERC20_ADDRESS = process.env.TANGA_TOKEN_ADDRESS_ETHEREUM;
const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;

async function main() {
  // const MyContractFactory = await ethers.getContractFactory(contract);
  // console.log("Deploying contract...");
  // const MyContract = await MyContractFactory.deploy();
  // await MyContract.deployed();
  //   const provider = ethers.provider;

  //   const signer = new ethers.Wallet(process.env.PRIVATE_KEY_1, provider);
  const signer = await ethers.getSigner();
  const nonce = await signer.getTransactionCount();
  const MyContract = new ethers.Contract(
    ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
    ABI_ETHEREUM_BRIDGE,
    signer
  );

  console.log({ MyContractAddress: MyContract.address });

  const ERC20 = new ethers.Contract(ERC20_ADDRESS, abi, ethers.provider);

  const ERC20_WITHSIGNER = ERC20.connect(signer);

  let allowance;

  allowance = await ERC20_WITHSIGNER.allowance(
    await signer.getAddress(),
    ETHEREUM_BRIDGE_CONTRACT_ADDRESS
  );
  console.log({ allowanceBefore: ethers.utils.formatEther(allowance) });

  if (+ethers.utils.formatEther(allowance) == 0) {
    console.log("Calling the ERC20 approve function...");
    const approve = await ERC20_WITHSIGNER.approve(
      MyContract.address,
      ethers.utils.parseUnits("10000", 18)
    );
    approve.wait();
    console.log({ approve });
  }
  allowance = await ERC20_WITHSIGNER.allowance(
    await signer.getAddress(),
    ETHEREUM_BRIDGE_CONTRACT_ADDRESS
  );
  console.log({ allowanceAfter: ethers.utils.formatEther(allowance) });
  const balanceOf_admin = await ERC20_WITHSIGNER.balanceOf(
    await signer.getAddress()
  );
  const balanceOf_contract = await ERC20_WITHSIGNER.balanceOf(
    MyContract.address
  );
  console.log({
    balanceOf_admin: ethers.utils.formatEther(balanceOf_admin),
    balanceOf_contract: ethers.utils.formatEther(balanceOf_contract),
    signer_nonce: nonce,
  });

  // const tx = await MyContract.lockTokens(
  //   "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  //   ethers.utils.parseUnits("1", 18),
  //   "TANGA",
  //   "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82"
  // );

  // const tx = await MyContract.unlockTokens(
  //   process.env.ADMIN_ADDRESS,
  //   ethers.utils.parseUnits("1", 18),
  //   "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
  //   nonce
  // );

  // tx.wait();

  // console.log({ tx });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
