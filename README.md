# Technical Documentation 
## Worldland-Ethereum Bridge

### version 2.0

### 2023.11.20

# BridgeBase

The BridgeBase is a major contract forked from Cosmos Gravity Bridge that holds the main functions and stores the users' funds.

There are two main functionalities:

## - ETH to Wrapped ETH transfer:

![graph_1](assets/graph_1.png)

The logic is quite simple, a user calls the lockETH function on Ethereum and sends an amount of eth to the contract. Function emits eth transfer event which is picked up by signer node. It then mints wrapped Eth on the tendermint chain (Worldland) to the user address. If a user wants to get their funds back on ethereum they call burnWETH function that burns their wrapped eth and emits burn event which is then picked up by node and the amount of locked eth is sent from the contract to the user address on ethereum.

## - Token to Token transfer:

![graph_1](assets/graph_1.png)

The logic is pretty much similar to ETH to WETH transfer. The original tokens are locked in Ethereum and the same amount is minted on the tendermint chain (Worldland). If a user wants their tokens back on Ethereum they burn a specific amount on the Worldland and node(signer) will transfer the amount from the contract to the user on Ethereum.

# Node(signer)

Encrypted owner private key is stored on the server and script execution is implemented by providing a password to the encrypted key on the shell. The events are listened to from contracts on both chains at the same time. Transactions are stored and batch executed each 15 seconds.

# Security Concerns

## BridgeBase :

![lock-eth-png](assets/lock-eth.png)

lockETH => does pretty much the same thing as sendToCosmos function, it first checks the reentrancy state to prevent the reentrancy attacks and if the contract is not in emergency state then the admin fee is calculated and sent to the owner of the contract which is bridge signer (node), after which the remaining amount is transferred to the contract and event is emitted.

![mint-weth-png](assets/lock-eth.png)

mintWETH => function is called by node after listening to a lockETH event on Ethereum to mint the same amount on Worldland. It checks if the caller is the owner which is the node in our case and if the contract is not in an emergency state, after the reentrancy check is made to prevent the nested stack call to the function. It receives the sender's signature as an argument to verify the signer, the signer’s address is recovered from the signature along with the corresponding arguments and if the result equals the owner's address the function proceeds to the next step. Next, the other chain nonce (transaction order number) is checked to prevent the same transactions accidentally being executed twice or more. If the above conditions are met the contract mints tokens to the user address.

## The BridgeBase contract has been forked from Cosmos Gravity Bridge with some modifications to the original code. The main functions used are:

sendToCosmos => Tokens are locked on the Ethereum side by sending them to the Gravity.sol smart contract. This emits an event that is observable to validators running the orchestrator => [Link to the code](https://github.com/Gravity-Bridge/Gravity-Bridge/blob/main/solidity/contracts/Gravity.sol)

submitBatch => When a quorum of validators agrees that tokens have been locked on Ethereum, including the requisite confirmation blocks, a relayer is selected to send an instruction to the Gravity module, which issues new tokens. [Link to the code](https://github.com/Gravity-Bridge/Gravity-Bridge/blob/main/solidity/contracts/Gravity.sol)

verifySig => Utility function to verify geth style signatures. [Link to the code](https://github.com/Gravity-Bridge/Gravity-Bridge/blob/main/solidity/contracts/Gravity.sol)
