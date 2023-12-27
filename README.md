## Worldland-Ethereum Bridge

Technical Documentation

The BridgeBase is a major contract forked from Cosmos Gravity Bridge that holds the main functions and stores the users' funds.

There are two main functionalities:

### - ETH to Wrapped ETH transfer:

![graph_1](assets/graph_1.png)

The logic is quite simple, the sender (see step 1 in the picture) calls the lockETH function within the Bridge contract on Ethereum network and sends an amount of ETH to the contract. The lockETH function emits an ETH transfer event which is picked up by Worldland Bridge Node. It then mints wrapped Eth on the tendermint chain (Worldland) to the user address.

If a sender wants to get their funds back on Ethereum they call burnWETH function in BridgeBase contract on Worldland that burns their wrapped eth and emits burn event which is then picked up by node and the amount of locked eth is sent from the contract on Ethereum to the user address.

### - Token to Token transfer:

![graph_2](assets/graph_2.png)

The logic is pretty much similar to ETH to WETH transfer. The original tokens are locked in Ethereum and the same amount is minted on the tendermint chain (Worldland). If a sender wants their tokens back on Ethereum they burn a specific amount on the Worldland deployed BridgeBase contract and node(signer) will transfer the amount from the contract to the user on Ethereum.

## Node(signer)

Encrypted owner private key is stored on the server.

In order to start the bridge process, a transaction monitoring script should be run initially by providing a password to the encrypted key in the environment file by the owner(the password can be deleted from the environment file after starting the process). The events are listened to from contracts on both chains at the same time. Transactions are queued and batch executed each 15 seconds which saves a significant amount in transaction fees. The process is completely event-driven which means the monitoring script listens (listening does not cost gas) to incoming events from both chains and stores transactions in the transaction pool. The transaction pool is checked each 15 seconds, waiting transactions are sent in batch and removed from the pool.

- Steps to initiate the node:

1.  Encrypt the owner private key:

        a. Go to the eth-wld-bridge folder and set the owner private key inside .env file in the following  format:

            ```shell
            PRIVATE_KEY=your_private_key
            ```
        b. Set a password for your private key inside of .env file in the following format: (the password is used to decrypt the encrypted private key later):

            ```shell
            PRIVATE_KEY_PW=your_password
            ```

        c. Go to the /scripts folder and run encryptKey.js file:

            ```shell
            node encryptKey.js
            ```

           * Providing you have PRIVATE_KEY and PRIVATE_KEY_PW environment variables set inside the .env file it will generate .encryptedKey.json file which is a  cryptographically generated description and hash of the private key inside the root folder. Now we can safely delete the PRIVATE_KEY variable from the environment file.

2.  Run the node:

        * This documentation assumes that you have pm2 (daemon process manager) installed in your system.

        a. Go to the root folder and run ecosystem.config.js with pm2 start:

            ```shell
            pm2 start ecosystem.config.js
            ```

        b. Check the running process with pm2 log:

             ```shell
             pm2 log
             ```

        * The script should successfully run and output the following:

             ```shell
             Started monitoring chains [1, 2] for Lock transactions...
             ```

        * Transaction live tracking state:

![node-tx-track](assets/node-tx-track.png)

        * Ether lock event detection state on chain 2 (Worldland):

![lock-event-detect](assets/lock-event-detect.png)

        * Now we can safely delete the PRIVATE_KEY_PW variable from the environment file.

3. Delete the PRIVATE_KEY_PW variable from .env file

## Security Concerns

- Things to note:

* After deleting the PRIVATE_KEY and PRIVATE_KEY_PW they are still stored in the memory of the computer. Before usage please consider the following risks associated with it:

RAM scraping is a technique used by cybercriminals to extract sensitive data from a computer's random access memory (RAM)

- Possible solution:

* Keep the server address private (security measure known as “security through obscurity”):

As there is no external REST request/responses made to and from the server. The IP address could be stored privately and not shared to the public. This puts an extra layer of security.

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
            address[] calldata destinations,
            uint256[] calldata amounts,
            uint256[] calldata nonces,
            address token,
            bytes calldata signature
        ) external onlyOwner notInEmergency nonReentrant {
            bytes32 message = prefixed(keccak256(abi.encodePacked(token)));
            require(
                recoverSigner(message, signature) == owner(),
                "Wrong signature!"
            );
            // mint transaction amounts to destinations
            for (uint256 i = 0; i < amounts.length; i++) {
                require(!processedNonces[nonces[i]], "Mint already processed!");
                processedNonces[nonces[i]] = true;
                IWETH(token).mint(destinations[i], amounts[i]);
            }
        }
```

mintWETH => function is called by node after listening to a lockETH event on Ethereum to mint the same amount on Worldland. It checks if the caller is owner which is node in our case and if the contract is not in an emergency state, after the reentrancy check is made to prevent the nested stack call to the function. It receives the sender's signature as an argument to verify the signer, the signer’s address is recovered from the signature along with the corresponding arguments and if the result equals the owner's address the function proceeds to the next step. Before sending the amounts to destination addresses in batch we check the other chain nonce (transaction order number) to prevent the same transactions accidentally being executed twice. If the above conditions are met the contract mints tokens to the user addresses in batch.

### The BridgeBase contract has been forked from Cosmos Gravity Bridge with some modifications to the original code. The main functions used are:

sendToCosmos => Tokens are locked on the Ethereum side by sending them to the Gravity.sol smart contract. This emits an event that is observable to validators running the orchestrator => [Link to the code](https://github.com/Gravity-Bridge/Gravity-Bridge/blob/main/solidity/contracts/Gravity.sol)

submitBatch => When a quorum of validators agrees that tokens have been locked on Ethereum, including the requisite confirmation blocks, a relayer is selected to send an instruction to the Gravity module, which issues new tokens. [Link to the code](https://github.com/Gravity-Bridge/Gravity-Bridge/blob/main/solidity/contracts/Gravity.sol)

verifySig => Utility function to verify geth style signatures. [Link to the code](https://github.com/Gravity-Bridge/Gravity-Bridge/blob/main/solidity/contracts/Gravity.sol)

### BridgeBase :

- Upon transferring wrapped ether from tendermint chain (Worldland) back to Ethereum burnWETH function is called and original eth is unlocked to the user by calling unlockETH function.

```javascript
    function burnWETH(
        uint256 amount,
        address token
    ) external notInEmergency nonReentrant {
        require(
            IWETH(token).allowance(msg.sender, address(this)) > amount,
            "Insufficient allowance!"
        );
        uint256 fee = amount.mul(feeRate).div(percentage);
        uint256 afterFee = amount.sub(fee);
        require(fee > 0, "Fee should be greater than zero!");
        IWETH(token).transferFrom(msg.sender, owner(), fee);
        IWETH(token).burn(msg.sender, afterFee);
        emit BurnWETH(
            msg.sender,
            msg.sender,
            afterFee,
            token,
            block.timestamp,
            _nonce
        );
        _nonce++;
    }

```

```javascript
    function unLockETH(
        address[] calldata destinations,
        uint256[] calldata amounts,
        uint256[] calldata nonces,
        address token,
        bytes calldata signature
    ) external onlyOwner notInEmergency nonReentrant {
        bytes32 message = prefixed(keccak256(abi.encodePacked(token)));
        require(
            recoverSigner(message, signature) == owner(),
            "Wrong signature!"
        );
        // unlock transaction amounts to destinations
        for (uint256 i = 0; i < amounts.length; i++) {
            require(!processedNonces[nonces[i]], "UnLock already processed!");
            processedNonces[nonces[i]] = true;
            IWETH(token).withdraw(destinations[i], amounts[i]);
        }
    }

```

## Testing

#### Steps:

1. Deploy BridgeBase contract on both chains.
2. Start the monitoring node on a separate machine with the BridgeBase owner wallet address.
3. Change the PRIVATE_KEY from .env to a different address for testing
4. Start transfering funds from Ethereum to Worldland!

### Contract deployment on testnet

```
yarn deploy --network sepolia
yarn deploy --network worldland
```

These scripts do the following:

1. Deploy the BridgeBase contract
2. Deploy the Wrapped Ether contract
3. Deploy ERC20 token contract
4. The Ownership of Wrapped Ether and ERC20 token contracts is transfered to BridgeBase contract on both chains.

#### For testnet event monitoring run:

```
yarn watch--prod
```

#### Transfer Ether/Token

To test the bridge on testnet (currently sepolia) run:

- Send 1 eth from Sepolia testnet to Worldland:

```
yarn hardhat run scripts/send_chain1eth_to_chain2.js --network sepolia
```

Result should be:

- Your balance of Sepolia Ether decreases by 1
- Your balance of Wrapped Ether in Worldland increases by 1 (the amount will vary relative to the transaction fee sent to the bridge)

- Send 1 eth from Worldland to Sepolia:

```
yarn hardhat run scripts/send_chain2eth_to_chain1.js --network worldland
```

Result should be:

- Your balance of Worldland Ether decreases by 1
- Your balance of Wrapped Ether in Sepolia increases by 1 (the amount will vary relative to the transaction fee sent to the bridge)

### Contract deployment on local hardhat network

```
yarn deploy --network localhost_1
yarn deploy --network localhost_2
```

These scripts do the following:

1. Deploy the BridgeBase contract
2. Deploy the Wrapped Ether contract
3. Deploy ERC20 token contract
4. The Ownership of Wrapped Ether and ERC20 token contracts is transfered to BridgeBase contract on both chains.

#### For localhost event monitoring run:

```
yarn watch--dev
```

#### Transfer Ether/Token

To test the bridge on locahost run:

- Send 1 eth from localhost_1 to localhost_2:

```
yarn hardhat run scripts/send_chain1eth_to_chain2.js --network localhost_1
```

- Send 1 eth from localhost_2 to localhost_1:

```
yarn hardhat run scripts/send_chain2eth_to_chain1.js --network localhost_2
```

#### For the bridge transaction load test

To test the bridge capacity with a high volume of transactions on localhost_1 run:

```
yarn hardhat run test/loadtest.js --network localhost_1
```

To test the bridge capacity with a high volume of transactions on localhost_2 run:

```
yarn hardhat run test/loadtest.js --network localhost_2
```
