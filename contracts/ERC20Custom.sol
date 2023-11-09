// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20Custom is ERC20, Ownable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address owner, uint amount) external onlyOwner {
        _burn(owner, amount);
    }
}
