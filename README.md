High-level Technical Documentation

Worldland-Ethereum Bridge

version 1.0

2023.04.17

The google doc version is here: `https://docs.google.com/document/d/1AWtjq7ZMWP_RDh5lCfaCgGZuqERGmGWff6iy-XNva_U/edit`

Contents

BridgeBase Contract

Ethereum Bridge (inherited)

Worldland Bridge (inherited)

TokenBase(inherits ERC20)

IToken(interface)`

Sequence of the contracts and tokens to be deployed

Admin private key encryption

Node Listener

Frontend API connection

WLD-ETH Bridge Design

Bridge Base Contract

The BridgeBase is the major contract from which BridgeEth and BridgeWld inherit all the functions and variables from. The contract has 4 major external and 3 internal functions. (burn, mint, lock, unlock) (prefixed, splitSignature, recoverSigner)

Public Variables:

owner => admin of the contract. Initially, the contract deployer is set to be the admin
processedNonces => transaction record of addresses(senders)
userBalances => the balances of users in the contract (for Ethereum)

Events:

Transfer => takes in (from, to, amount, token, date, tokenType, nonce(transaction count), signature, step)

The documentation of lock:

params:

(address) to => the sender’s address whom the tokens should be locked(transferred) on the other chain

(uint256) amount => the amount of tokens to be locked(transferred)

(string calldata) tokenType => the token type/name being locked(transferred)

(address) token => the token address being locked(transferred)

(uint256) nonce => the transaction count of the user

(bytes calldata) signature => the signature hash signed before executing the transaction

The function is external(can be called by anyone). Checks for the allowance of the contract on the user’s token, if it is equal to 0 then reverted. Users will need to call the ERC20 approve function with some marginal amount and then come back. After the above condition is met, the specified amount of token is transferred from sender to the contract. In the end the transfer event is emitted with [sender address, receiver address, amount of token, token address, timestamp, tokenType(name), nonce(transaction count), signature, type of the function] and user balance at the contract is incremented by the amount.

The documentation of unlock:

params:

(address) to => the wallet address whom tokens should be unlocked on Ethereum

(uint256) amount => the amount of tokens to be unlocked(transferred)

(address) token => the token address being unlocked(transferred)

(uint256) nonce => transaction count of the caller

(bytes calldata) signature => the signature that admin signs before making the transaction

The function is external(can be called by anyone). Checks for the sender to be the owner of the contract(=admin) if not met reverts the function call. The 2nd line is encoding sender address, to address, amount of token, transaction count and generating Ethereum signed message hash. This procedure is done to retrieve the sender’s address from the combination of ethereum signed message and user signed signature. The recoverSigner function returns an address, if the returned address is not equal to the sender’s address the function is reverted.
Next line checks if the current transaction of the sender is not already processed. The user balance in the contract is checked, if the requested amount is more than the user’s balance at the contract, the transaction is reverted. The current transaction is set to be processed. The requested amount is transfered and user balance in the contract is decremented by the amount.

The documentation of mint:

params:

(address) to => address to which token gets minted

(uint256) amount => amount of a token to be minted

(address) token => token address

(uint256) nonce => transaction count of the sender

(bytes calldata) signature => signature of the sender

The sender address checked, if not equal to the owner address => transaction is reverted.
Next line is encoding sender address, to address, amount of token, transaction count and generating Ethereum signed message hash. This procedure is done to retrieve the sender’s address from the combination of ethereum signed message and user signed signature. The recoverSigner function returns an address, if the returned address is not equal to the sender’s address the function is reverted.
Next line checks if the current transaction of the sender is not already processed. The current transaction is set to be processed. The requested amount is minted to the address and user balance in the contract is incremented by the amount.

The documentation of burn:

params:

(address) to => address whose tokens get burned

(uint256) amount => amount of a token to be burned

(address) token => token address

(uint256) nonce => transaction count of the sender

(string calldata) tokenType => the name of the token

(bytes calldata) signature => signature of the sender

Checks if the current transaction of the sender is not already processed. The current transaction is set to be processed. The token amount is burned. Transfer event sent. The balance of the user in the contract is decremented.

The helper functions for cryptographic signature verification:

prefixed documentation:

Takes in a 32-byte hash value as input and returns another 32-byte hash value that has been prefixed with the message that it is an “Ethereum Signed Message” and its length is 32 bytes.
The prefix is added to the input hash by encoding it as a packed value with the prefix added as a string literal. Then, the packed value is hashed using keccak256 hashing algorithm to produce the final hash value.

recoverSigner & splitSignature documentation:

Takes in the message hash and the signature as input and returns the address of the signer. This function uses the “splitSignature” function to parse the signature into it’s three components (v, r, s) which are then passed to the “ecrecover” function along with the message hash to recover the address of the signer. Finally the recovered signer address is compared to the caller of the function(msg.sender) to verify that the signature was indeed generated by the owner of the private key associated with the signer address. If the comparison fails, an error message is thrown. Overall those helper functions are a secure way of verifying the cryptographic signature of a transaction on the Ethereum/Worldland blockchains.

BridgeBase (inherited):

The contract inherits from the BridgeBase and is initialized as BridgeBase. It is deployed to Ethereum.

WorldLandBridge (inherited):

The contract inherits from the BridgeBase and is initialized as WorldLandBridge. It is deployed to WorldLand.

TokenBase(inherits ERC20)

It is used to deploy a token on the blockchain.

This contract inherits all the variables and functions of ERC20. Declares a public variable admin(the owner of the token). Constructor sets the contract deployer to be the admin and creates ERC20 token contract with the name and symbol provided.

updateAdmin => function updates the admin variable to the given address(changes the owner of the token). It checks if the sender is the admin if true sets the admin to new address.

mint => mints token. Checks if the sender is admin if true, calls ERC20 internal \_mint function that will mint a specified amount to an address.

burn => burns token. Checks if the sender is admin if true, calls ERC20 internal \_burn function that will burn a specified amount of token of an address.

IToken(interface)

Type declaration for the functions created in TokenBase, for use inside of BridgeBase.
As ERC20 \_mint and \_burn functions are internal and can only be used by inheriting contracts and functions inside the contract, I have created a separate contract called TokenBase that inherits from ERC20 and creates separate public functions

Sequence of the contracts and tokens to be deployed

Hardhat library has been used for contract interaction and deployment with specific scripts.

After cloning the repository locally, run the following commands:

cd eth-wld-bridge
yarn
yarn hardhat compile (this will compile all the solidity contracts in the contracts folder)

Token deployment:

For the token deployment run the following: (tokens should be deployed both on Ethereum and Worldland)

yarn hardhat run scripts/deployToken.js --network ethereum

yarn hardhat run scripts/deployToken.js --network worldland

deployToken.js

Contract deployment:

For the contract deployment run the following:
on Ethereum:

    yarn hardhat run scripts/eth-deploy.js --network ethereum

on Worldland:
yarn hardhat run scripts/worldland-deploy.js --network worldland

eth-deploy.js

worldland-deploy.js

For minting custom token on Worldland use the following script: (mints 100000000 of token to the admin address)

    yarn hardhat run scripts/mintAndSendLocally-wld.js --network worldland

mintAndSendLocally-wld.js

The next step is to set the admin of the token contract on Worldland to the BridgeBase contract address. As the mint function is called from inside of the BridgeBase contract the sender is always going to be the BridgeBase contract address, so we send mint and burn privilege of token contract to BridgeBase contract.

Use the following script to call updateAdmin function to update the admin of token deployed on Worldland:

    yarn hardhat run scripts/updateAdmin-worldland.js --network worldland

updateAdmin-worldland.js

Admin private key encryption

The following script encrypts the private key and generates the encrypted version of the key as “.encryptedKey.json”. The password and private key should be specified as parameters to the encrypt function respectively.

encryptKey.js

The encrypted private key should look like something like this:

.encryptedKey.json

After encryption is complete the private key and password can be safely removed from the environment file (.env) and before running the file that requires admin’s private key the path should be specified to the .encryptedKey.json and password can be provided from the command line the following way:

node -e “process.env.PRIVATE_KEY_PW=’private_key_password’; require(./script_to_run);”

If the above code does not work, the script to be run can be run when the password is in the .env file. After the node is running the password can be safely deleted from the .env file.

Node Listener documentation

Listens for two chains at the same time, and executes appropriate functions on each chain accordingly.

Importing ethereum, worldland, ERC20 abis

Initializing contract addresses
De-hashing the encrypted private key by passing in the encryptedJson file and password to the de-hasher.
Initializing token addresses

Starting a monitor function: getting an api connection to both chains
Getting the Bridge Contract instance of chain_1(Ethereum)
Getting the Bridge Contract instance of chain_2(Worldland)
Connecting the signer’s(admin) wallet to both chains in two separate variables

    6)  Initializing a listener for the “Transfer” event on chain_1 and passing an anonymous function as a second argument to execute tasks and getting all the json data out of it.
     7)  Checking if the current transaction count is not already registered on the other chain (to avoid the same transaction being executed twice)
     8)  Connecting signer’s wallet to chain_2 and calling a mint function on chain_2 with the coming in parameters from chain_1

Awaiting the transaction and logging the result

Initializing listener for transfer event on chain_2
Initializing ERC20_chain_1 contract
Checking if the transaction count of chain_2 is not already registered on chain_1
Checking if the chain_1 contract balance is greater than the requested amount
Connecting signer’s balance to chain_1 and calling unlock function with given parameters

Frontend API connection

Users interact with the bridge contract directly by calling lock/burn functions. Frontend is connected to web3 and enables users to interact with blockchain conveniently.

There are 3 major functions being used to send/query data to and from bridge contract:

chain_query (makes data query to bridge contract and gets user balances and allowances)
requestTransaction (uses window.ethereum (metamask) to send transactions)
getabist_forfunction => encodes the function to be called and its parameters and returns binary (=> passed in as data for requestTransaction)

Contract addresses are stored on contract_addresses.js file:

After deploying token and bridge contracts, addresses should be saved here

Nettype is specified as “testnet” in nettype.js file, if changing to “mainnet” needs to be specified here:

RPC testnet/mainnet urls are stored here:

Ethereum chain connection is based on nettype coming from nettype.js: (currently uses Sepolia test network both for testnet/mainnet (urls should be updated))

web3-eth.js

Worldland chain connection is based on nettype coming from nettype.js: (testnet/mainnet are set to use the same url currently)
web3-wld.js

metamask.js

contract_calls.js

contract_calls.js

User balance query:

Deposit.tsx

Querying allowance for ERC20:
Deposit.tsx

Sending a transaction:

Deposit.tsx
