// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IToken.sol";

contract PolygonBridge {
    address public owner;
    uint256 public nonce;
    mapping(uint256 => bool) public processedNonces;

    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed amount,
        address token,
        string tokenType,
        uint256 nonce
    );

    event Mint(
        address to,
        uint256 amount,
        address token,
        string tokenType,
        uint256 otherChainNonce
    );

    constructor() {
        owner = msg.sender;
    }

    function lockTokens(
        address to,
        uint256 amount,
        string calldata tokenType,
        address token
    ) external {
        if (IERC20(token).allowance(msg.sender, address(this)) == 0) {
            revert("Allowance is 0!");
        }
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        emit Transfer(msg.sender, to, amount, token, tokenType, nonce);
        nonce++;
    }

    function unlockTokens(
        address to,
        uint256 amount,
        address token,
        uint256 otherChainNonce
    ) external {
        require(msg.sender == owner, "Not authorized!");
        require(!processedNonces[otherChainNonce], "Already processed!");
        processedNonces[otherChainNonce] = true;
        IERC20(token).transfer(to, amount);
    }

    function mint(
        address to,
        uint256 amount,
        address token,
        string calldata tokenType,
        uint256 otherChainNonce
    ) external {
        require(msg.sender == owner, "Not authorized!");
        require(
            processedNonces[otherChainNonce] == false,
            "Transfer already processed!"
        );
        processedNonces[otherChainNonce] = true;
        IToken(token).mint(to, amount);
        emit Mint(to, amount, token, tokenType, otherChainNonce);
    }
}
