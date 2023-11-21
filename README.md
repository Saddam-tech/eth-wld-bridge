## Worldland-Ethereum Bridge

## Technical Documentation

The BridgeBase is a major contract forked from Cosmos Gravity Bridge that holds the main functions and stores the users' funds.

There are two main functionalities:

### - ETH to Wrapped ETH transfer:

![graph_1](assets/graph_1.png)

The logic is quite simple, a user calls the lockETH function on Ethereum and sends an amount of eth to the contract. Function emits eth transfer event which is picked up by signer node. It then mints wrapped Eth on the tendermint chain (Worldland) to the user address. If a user wants to get their funds back on ethereum they call burnWETH function that burns their wrapped eth and emits burn event which is then picked up by node and the amount of locked eth is sent from the contract to the user address on ethereum.

### - Token to Token transfer:

![graph_1](assets/graph_2.png)

The logic is pretty much similar to ETH to WETH transfer. The original tokens are locked in Ethereum and the same amount is minted on the tendermint chain (Worldland). If a user wants their tokens back on Ethereum they burn a specific amount on the Worldland and node(signer) will transfer the amount from the contract to the user on Ethereum.

## Node(signer)

Encrypted owner private key is stored on the server and script execution is implemented by providing a password to the encrypted key on the shell. The events are listened to from contracts on both chains at the same time. Transactions are stored and batch executed each 15 seconds.

## Security Concerns

### BridgeBase :

```javascript
    function lockETH(
        address to,
        address token
    ) external payable notInEmergency nonReentrant {
        uint256 fee = msg.value.mul(feeRate).div(percentage);
        uint256 afterFee = msg.value.sub(fee);
        require(fee > 0, "Fee should be greater than zero!");
        (bool success, ) = owner().call{value: fee}("");
        require(success, "Transfer to owner failed!");
        IWETH(token).deposit{value: afterFee}(msg.sender);
        emit LockETH(msg.sender, to, afterFee, token, block.timestamp, _nonce);
        _nonce++;
    }
```

lockETH => does pretty much the same thing as sendToCosmos function, it first checks the reentrancy state to prevent the reentrancy attacks and if the contract is not in emergency state then the admin fee is calculated and sent to the owner of the contract which is bridge signer (node), after which the remaining amount is transferred to the contract and event is emitted.

```javascript
        function mintWETH(
            address to,
            uint256 amount,
            address token,
            uint256 nonce,
            bytes calldata signature
        ) external onlyOwner notInEmergency nonReentrant {
            bytes32 message = prefixed(
                keccak256(abi.encodePacked(to, amount, token, nonce))
            );
            require(
                recoverSigner(message, signature) == owner(),
                "Wrong signature!"
            );
            require(!processedNonces[nonce], "Mint already processed!");
            processedNonces[nonce] = true;
            IWETH(token).mint(to, amount);
    }
```

mintWETH => function is called by node after listening to a lockETH event on Ethereum to mint the same amount on Worldland. It checks if the caller is the owner which is the node in our case and if the contract is not in an emergency state, after the reentrancy check is made to prevent the nested stack call to the function. It receives the sender's signature as an argument to verify the signer, the signer’s address is recovered from the signature along with the corresponding arguments and if the result equals the owner's address the function proceeds to the next step. Next, the other chain nonce (transaction order number) is checked to prevent the same transactions accidentally being executed twice or more. If the above conditions are met the contract mints tokens to the user address.

### The BridgeBase contract has been forked from Cosmos Gravity Bridge with some modifications to the original code. The main functions used are:

sendToCosmos => Tokens are locked on the Ethereum side by sending them to the Gravity.sol smart contract. This emits an event that is observable to validators running the orchestrator => [Link to the code](https://github.com/Gravity-Bridge/Gravity-Bridge/blob/main/solidity/contracts/Gravity.sol)

submitBatch => When a quorum of validators agrees that tokens have been locked on Ethereum, including the requisite confirmation blocks, a relayer is selected to send an instruction to the Gravity module, which issues new tokens. [Link to the code](https://github.com/Gravity-Bridge/Gravity-Bridge/blob/main/solidity/contracts/Gravity.sol)

verifySig => Utility function to verify geth style signatures. [Link to the code](https://github.com/Gravity-Bridge/Gravity-Bridge/blob/main/solidity/contracts/Gravity.sol)

## Testing

#### Steps:

1. Deploy BridgeBase contract on both chains.
2. Start the monitoring node on a separate machine with the BridgeBase owner wallet address.
3. Change the PRIVATE_KEY from .env to a different address for testing
4. Start transfering funds from Ethereum to Worldland!

### Contract deployment on testnet

```yarn deploy --network sepolia
   yarn deploy --network worldland
```

These scripts do the following:

1. Deploy the BridgeBase contract
2. Deploy the Wrapped Ether contract
3. Deploy ERC20 token contract
4. The Ownership of Wrapped Ether and ERC20 token contracts is transfered to BridgeBase contract on both chains.

#### For testnet event monitoring run:

```yarn watch--prod

```

#### Transfer Ether/Token

To test the bridge on testnet (currently sepolia) run:

- Send 1 eth from Sepolia testnet to Worldland:

```yarn hardhat run scripts/send_chain1eth_to_chain2.js --network sepolia

```

Result should be:

- Your balance of Sepolia Ether decreases by 1
- Your balance of Wrapped Ether in Worldland increases by 1 (the amount will vary relative to the transaction fee sent to the bridge)

- Send 1 eth from Worldland to Sepolia:

```yarn hardhat run scripts/send_chain1eth_to_chain2.js --network worldland

```

Result should be:

- Your balance of Worldland Ether decreases by 1
- Your balance of Wrapped Ether in Sepolia increases by 1 (the amount will vary relative to the transaction fee sent to the bridge)

### Contract deployment on local hardhat network

```yarn deploy --network localhost_1
   yarn deploy --network localhost_2
```

These scripts do the following:

1. Deploy the BridgeBase contract
2. Deploy the Wrapped Ether contract
3. Deploy ERC20 token contract
4. The Ownership of Wrapped Ether and ERC20 token contracts is transfered to BridgeBase contract on both chains.

#### For localhost event monitoring run:

```yarn watch--dev

```

#### Transfer Ether/Token

To test the bridge on locahost run:

- Send 1 eth from localhost_1 to localhost_2:

```yarn hardhat run scripts/send_chain1eth_to_chain2.js --network localhost_1

```

- Send 1 eth from localhost_2 to localhost_1:

```yarn hardhat run scripts/send_chain1eth_to_chain2.js --network localhost_2

```

#### For a bridge transaction load test

To test the bridge capacity with a high volume of transactions on localhost_1 run:

```yarn hardhat run test/loadtest.js --network localhost_1

```

To test the bridge capacity with a high volume of transactions on localhost_2 run:

```yarn hardhat run test/loadtest.js --network localhost_2

```

##### version 2.0

##### 2023.11.20
