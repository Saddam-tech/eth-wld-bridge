// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IToken.sol";

contract BSCBridge {
    address public owner;
    uint256 public nonce;
    mapping(uint256 => bool) public processedNonces;

    IToken public token;

    event Transfer(
        address indexed from,
        uint256 indexed amount,
        address indexed to,
        uint256 nonce
    );

    event Mint(address to, uint256 amount, uint256 otherChainNonce);

    constructor(address _token) {
        owner = msg.sender;
        token = IToken(_token);
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
        address from,
        address to,
        uint256 amount,
        uint256 otherChainNonce
    ) external {
        require(msg.sender == owner, "Not authorized");
        require(!processedNonces[otherChainNonce], "Already processed");
        processedNonces[otherChainNonce] = true;
        token.transfer(to, amount);
    }

    function mint(
        address to,
        uint256 amount,
        uint256 otherChainNonce
    ) external {
        require(msg.sender == owner, "Not authorized!");
        require(
            processedNonces[otherChainNonce] == false,
            "Transfer already processed!"
        );
        processedNonces[otherChainNonce] = true;
        token.mint(to, amount);
        emit Mint(to, amount, otherChainNonce);
    }
}
