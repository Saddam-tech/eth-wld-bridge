const { ethers } = require("hardhat");
require("dotenv").config();

const abi = [
  "function balanceOf(address account) external view returns (uint256)",
];
const ABI_ETHEREUM_BRIDGE = [];

const ERC20_ADDRESS = process.env.TANGA_TOKEN_ADDRESS_ETHEREUM;
const ETHEREUM_BRIDGE_CONTRACT_ADDRESS =
  process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS;

async function main() {
  const signer = await ethers.getSigner();
  const nonce = await signer.getTransactionCount();
  const MyContract = new ethers.Contract(
    ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
    ABI_ETHEREUM_BRIDGE,
    signer
  );

  console.log({ MyContractAddress: MyContract.address });
  console.log({ signer: signer.getAddress() });

  const ERC20 = new ethers.Contract(ERC20_ADDRESS, abi, ethers.provider);

  const ERC20_WITHSIGNER = ERC20.connect(signer);
  const balanceOf_admin = await ERC20_WITHSIGNER.balanceOf(signer.getAddress());
  const balanceOf_contract = await ERC20_WITHSIGNER.balanceOf(
    MyContract.address
  );
  console.log({
    balanceOf_admin: ethers.utils.formatEther(balanceOf_admin),
    balanceOf_contract: ethers.utils.formatEther(balanceOf_contract),
    signer_nonce: nonce,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
