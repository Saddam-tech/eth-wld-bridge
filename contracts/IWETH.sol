// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IWETH {
    function balanceOf(address account) external view returns (uint256);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function deposit(address sender) external payable;

    function withdraw(address to, uint256 amount) external;

    function mint(address sender, uint256 amount) external;

    function burn(address sender, uint256 amount) external;

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function transfer(address to, uint256 amount) external returns (bool);

    function transferOwnership(address newOwner) external;
}
