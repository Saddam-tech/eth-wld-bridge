// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IToken.sol";

contract BridgeBase {
    address public owner;
    mapping(address => mapping(uint256 => bool)) public processedNonces;
    mapping(address => mapping(address => uint256)) public userBalances;

    constructor() {
        owner = msg.sender;
    }

    enum Step {
        Burn,
        Lock
    }

    event Transfer(
        address from,
        address to,
        uint256 amount,
        address token,
        uint date,
        string tokenType,
        uint256 nonce,
        Step indexed step
    );

    function mint(
        address to,
        uint256 amount,
        address token,
        uint256 nonce,
        bytes calldata signature
    ) external {
        require(msg.sender == owner, "Not authorized!");
        bytes32 message = prefixed(
            keccak256(abi.encodePacked(msg.sender, to, amount, nonce))
        );
        require(recoverSigner(message, signature) == owner, "Wrong signature!");
        require(
            processedNonces[msg.sender][nonce] == false,
            "Transfer already processed!"
        );
        processedNonces[msg.sender][nonce] = true;
        IToken(token).mint(to, amount);
        userBalances[to][token] += amount;
    }

    function burn(
        address to,
        uint256 amount,
        address token,
        uint256 nonce,
        string calldata tokenType
    ) external {
        require(!processedNonces[msg.sender][nonce], "Already processed!");
        processedNonces[msg.sender][nonce] = true;
        IToken(token).burn(msg.sender, amount);
        emit Transfer(
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

    function lock(
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
            "Transfer failed"
        );
        emit Transfer(
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

    function unlock(
        address to,
        uint256 amount,
        address token,
        uint256 nonce,
        bytes calldata signature
    ) external {
        require(msg.sender == owner, "Not authorized!");
        bytes32 message = prefixed(
            keccak256(abi.encodePacked(msg.sender, to, amount, nonce))
        );
        require(recoverSigner(message, signature) == owner, "Wrong signature!");
        require(
            !processedNonces[msg.sender][nonce],
            "Transfer already processed!"
        );
        require(
            userBalances[to][token] >= amount,
            "Balance of the user at the contract is less than the amount requested!"
        );
        processedNonces[msg.sender][nonce] = true;
        IERC20(token).transfer(to, amount);
        userBalances[to][token] -= amount;
    }

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
