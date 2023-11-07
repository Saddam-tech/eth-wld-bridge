// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./WETH.sol";
import "./IWETH.sol";
import "./IToken.sol";

contract BridgeBase is Ownable {
    mapping(address => mapping(uint256 => bool)) public processedNonces;
    mapping(address => mapping(address => uint256)) public userBalances;

    enum Step {
        Burn,
        Lock
    }

    event TransferToken(
        address from,
        address to,
        uint256 amount,
        address token,
        uint date,
        string tokenType,
        uint256 nonce,
        Step indexed step
    );

    event LockETH(
        address from,
        address to,
        uint256 amount,
        address token,
        uint date,
        uint256 nonce
    );
    event BurnWETH(
        address from,
        address to,
        uint256 amount,
        address token,
        uint date,
        uint256 nonce
    );

    // TOKEN

    function mintToken(
        address to,
        uint256 amount,
        address token,
        uint256 nonce,
        bytes calldata signature
    ) external onlyOwner {
        bytes32 message = prefixed(
            keccak256(abi.encodePacked(to, amount, token, nonce))
        );
        require(
            recoverSigner(message, signature) == owner(),
            "Wrong signature!"
        );
        require(
            processedNonces[msg.sender][nonce] == false,
            "TransferToken already processed!"
        );
        processedNonces[msg.sender][nonce] = true;
        IToken(token).mint(to, amount);
        userBalances[to][token] += amount;
    }

    function burnToken(
        address to,
        uint256 amount,
        address token,
        uint256 nonce,
        string calldata tokenType
    ) external {
        require(!processedNonces[msg.sender][nonce], "Already processed!");
        processedNonces[msg.sender][nonce] = true;
        IToken(token).burn(msg.sender, amount);
        emit TransferToken(
            msg.sender,
            to,
            amount,
            token,
            block.timestamp,
            tokenType,
            nonce,
            Step.Burn
        );
        userBalances[msg.sender][token] -= amount;
    }

    function lockToken(
        address to,
        uint256 amount,
        string calldata tokenType,
        address token,
        uint256 nonce
    ) external {
        if (IERC20(token).allowance(msg.sender, address(this)) == 0) {
            revert("Allowance is 0!");
        }
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "TransferToken failed"
        );
        emit TransferToken(
            msg.sender,
            to,
            amount,
            token,
            block.timestamp,
            tokenType,
            nonce,
            Step.Lock
        );
        userBalances[msg.sender][token] += amount;
    }

    function unlockToken(
        address to,
        uint256 amount,
        address token,
        uint256 nonce,
        bytes calldata signature
    ) external onlyOwner {
        bytes32 message = prefixed(
            keccak256(abi.encodePacked(to, amount, token, nonce))
        );
        require(
            recoverSigner(message, signature) == owner(),
            "Wrong signature!"
        );
        require(
            !processedNonces[msg.sender][nonce],
            "TransferToken already processed!"
        );
        require(
            userBalances[to][token] >= amount,
            "Balance of the user at the contract is less than the amount requested!"
        );
        processedNonces[msg.sender][nonce] = true;
        IERC20(token).transfer(to, amount);
        userBalances[to][token] -= amount;
    }

    // WRAPPED ETHER

    function lockETH(
        address to,
        address token,
        uint256 nonce
    ) external payable {
        require(!processedNonces[msg.sender][nonce], "Lock already processed!");
        processedNonces[msg.sender][nonce] = true;
        IWETH(token).deposit(msg.sender, msg.value);
        emit LockETH(msg.sender, to, msg.value, token, block.timestamp, nonce);
    }

    function unLockETH(
        address to,
        uint256 amount,
        address token,
        uint256 nonce,
        bytes calldata signature
    ) external onlyOwner {
        bytes32 message = prefixed(
            keccak256(abi.encodePacked(to, amount, token, nonce))
        );
        require(
            recoverSigner(message, signature) == owner(),
            "Wrong signature!"
        );
        require(!processedNonces[msg.sender][nonce], "Mint already processed!");
        processedNonces[msg.sender][nonce] = true;
        IWETH(token).withdraw(to, amount);
    }

    function mintWETH(
        address to,
        uint256 amount,
        address token,
        uint256 nonce,
        bytes calldata signature
    ) external onlyOwner {
        bytes32 message = prefixed(
            keccak256(abi.encodePacked(to, amount, token, nonce))
        );
        require(
            recoverSigner(message, signature) == owner(),
            "Wrong signature!"
        );
        require(!processedNonces[msg.sender][nonce], "Mint already processed!");
        processedNonces[msg.sender][nonce] = true;
        IWETH(token).mint(to, amount);
    }

    function burnWETH(uint256 amount, address token, uint256 nonce) external {
        require(!processedNonces[msg.sender][nonce], "Burn already processed!");
        processedNonces[msg.sender][nonce] = true;
        IWETH(token).burn(msg.sender, amount);
        emit BurnWETH(
            msg.sender,
            msg.sender,
            amount,
            token,
            block.timestamp,
            nonce
        );
    }

    // utils

    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
            );
    }

    function recoverSigner(
        bytes32 message,
        bytes memory sig
    ) internal pure returns (address) {
        uint8 v;
        bytes32 r;
        bytes32 s;

        (v, r, s) = splitSignature(sig);

        return ecrecover(message, v, r, s);
    }

    function splitSignature(
        bytes memory sig
    ) internal pure returns (uint8, bytes32, bytes32) {
        require(sig.length == 65);
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }
}
