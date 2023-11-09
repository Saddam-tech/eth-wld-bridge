// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IToken {
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function mint(address to, uint amount) external;

    function burn(address owner, uint amount) external;

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function transfer(address to, uint256 amount) external returns (bool);

    function transferOwnership(address newOwner) external;
}
