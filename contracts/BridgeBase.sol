// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IToken.sol";

contract BridgeBase {
    address public owner;
    mapping(address => mapping(uint256 => bool)) public processedNonces;

    constructor() {
        owner = msg.sender;
    }

    enum Step {
        Burn,
        Mint,
        Lock,
        Unlock
    }

    event Transfer(
        address from,
        address to,
        uint256 amount,
        address token,
        uint date,
        string tokenType,
        uint256 nonce,
        bytes signature,
        Step indexed step
    );

    function mint(
        address to,
        uint256 amount,
        address token,
        string calldata tokenType,
        uint256 nonce,
        bytes calldata signature
    ) external {
        require(msg.sender == owner, "Not authorized!");
        require(
            processedNonces[msg.sender][nonce] == false,
            "Transfer already processed!"
        );
        processedNonces[msg.sender][nonce] = true;
        IToken(token).mint(to, amount);
    }

    function burn(
        address to,
        uint256 amount,
        address token,
        uint256 nonce,
        string calldata tokenType,
        bytes calldata signature
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
            signature,
            Step.Burn
        );
    }

    function lockTokens(
        address to,
        uint256 amount,
        string calldata tokenType,
        address token,
        uint256 nonce,
        bytes calldata signature
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
            signature,
            Step.Lock
        );
    }

    function unlockTokens(
        address to,
        uint256 amount,
        address token,
        string calldata tokenType,
        uint256 nonce,
        bytes calldata signature
    ) external {
        require(msg.sender == owner, "Not authorized!");
        require(
            !processedNonces[msg.sender][nonce],
            "Transfer already processed!"
        );
        processedNonces[msg.sender][nonce] = true;
        IERC20(token).transfer(to, amount);
    }
}
