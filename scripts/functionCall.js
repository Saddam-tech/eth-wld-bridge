const { ethers } = require("hardhat");
require("dotenv").config();

const ABI_ETHEREUM_BRIDGE = [
  "function lockTokens(address to, uint256 amount, string calldata tokenType, address token) external returns (void)",
  "function unlockTokens(address to, uint256 amount, address token, uint256 otherChainNonce) external returns (void)",
];
const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;

const TANGA_TOKEN_ADDRESS_ETHEREUM = process.env.TANGA_TOKEN_ADDRESS_ETHEREUM;
const RECEIVER_ADDRRESS = process.env.RECEIVER_ADDRESS;

async function main() {
  const provider = ethers.provider;

  const signer = new ethers.Wallet(process.env.PRIVATE_KEY_1, provider);
  // const signer = await ethers.getSigner();
  const MyContract = new ethers.Contract(
    ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
    ABI_ETHEREUM_BRIDGE,
    signer
  );

  console.log({ MyContractAddress: MyContract.address });

  const tx = await MyContract.lockTokens(
    RECEIVER_ADDRRESS,
    ethers.utils.parseUnits("24", 18),
    "TANGA",
    TANGA_TOKEN_ADDRESS_ETHEREUM
  );
  tx.wait();

  console.log({ tx });

  // const nonce = await signer.getTransactionCount();

  //   const ERC20 = new ethers.Contract(ERC20_ADDRESS, abi, ethers.provider);

  //   const ERC20_WITHSIGNER = ERC20.connect(signer);

  //   const approve = await ERC20_WITHSIGNER.approve(
  //     MyContract.address,
  //     ethers.utils.parseUnits("10000", 18)
  //   );
  //   console.log({ approve });

  //   const allowance = await ERC20_WITHSIGNER.allowance(
  //     signer.getAddress(),
  //     ETHEREUM_BRIDGE_CONTRACT_ADDRESS
  //   );

  //   const balanceOf_admin = await ERC20_WITHSIGNER.balanceOf(signer.getAddress());
  //   const balanceOf_contract = await ERC20_WITHSIGNER.balanceOf(
  //     MyContract.address
  //   );

  //   console.log({
  //     balanceOf_admin: ethers.utils.formatEther(balanceOf_admin),
  //     balanceOf_contract: ethers.utils.formatEther(balanceOf_contract),
  //     signer_nonce: nonce,
  //   });

  //   const tx = await ERC20_WITHSIGNER.approve(
  //     MyContract.address,
  //     ethers.utils.parseUnits("1000000", 18)
  //   );
  //   tx.wait();
  //   console.log({ tx });

  // const tx = await MyContract.unlockTokens(
  //   process.env.ADMIN_ADDRESS,
  //   ethers.utils.parseUnits("1", 18),
  //   "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
  //   nonce
  // );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
