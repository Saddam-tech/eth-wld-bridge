// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract EthereumBridge {
    address public owner;
    uint256 public nonce;
    mapping(uint256 => bool) public processedNonces;

    IERC20 public token;

    event Transfer(
        address indexed from,
        uint256 indexed amount,
        address indexed to,
        uint256 nonce
    );

    constructor(address _token) {
        owner = msg.sender;
        token = IERC20(_token);
    }

    function lockTokens(address to, uint256 amount) external {
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        emit Transfer(msg.sender, amount, to, nonce);
        nonce++;
    }

    function unlockTokens(
        address to,
        uint256 amount,
        uint256 otherChainNonce
    ) external {
        require(msg.sender == owner, "Not authorized!");
        require(!processedNonces[otherChainNonce], "Already processed!");
        processedNonces[otherChainNonce] = true;
        token.transfer(to, amount);
    }
}
