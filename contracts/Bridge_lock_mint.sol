// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenBridge is Ownable {
    IERC20 public token;
    mapping(bytes32 => bool) public usedEvents;

    event Locked(address indexed sender, uint256 amount, bytes32 lockId);
    event Minted(address indexed receiver, uint256 amount, bytes32 lockId);
    event Released(address indexed receiver, uint256 amount, bytes32 lockId);

    constructor(address _token) {
        token = IERC20(_token);
    }

    function lock(uint256 amount, bytes32 lockId) external {
        require(!usedEvents[lockId], "Lock ID already used");
        usedEvents[lockId] = true;
        token.transferFrom(msg.sender, address(this), amount);
        emit Locked(msg.sender, amount, lockId);
    }

    function mint(
        address receiver,
        uint256 amount,
        bytes32 lockId
    ) external onlyOwner {
        require(!usedEvents[lockId], "Lock ID already used");
        usedEvents[lockId] = true;
        token.transfer(receiver, amount);
        emit Minted(receiver, amount, lockId);
    }

    function release(
        address receiver,
        uint256 amount,
        bytes32 lockId
    ) external onlyOwner {
        require(!usedEvents[lockId], "Lock ID already used");
        usedEvents[lockId] = true;
        token.transfer(receiver, amount);
        emit Released(receiver, amount, lockId);
    }
}
