// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./TokenBase.sol";

contract TokenWld is TokenBase {
    constructor() TokenBase("WorldLand Token", "eETH") {}
}
