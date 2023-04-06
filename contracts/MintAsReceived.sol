// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IToken {
    function mint(address to, uint amount) external;
}

contract MintAsReceived is ERC20 {
    address public admin;
    mapping(address => uint256) public mapAddressToAmount;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        admin = msg.sender;
    }

    function mint(address token) public payable {
        // require(msg.sender == admin, "Only admin!");
        mapAddressToAmount[msg.sender] = msg.value;
        IToken(token).mint(msg.sender, msg.value);
    }
}
