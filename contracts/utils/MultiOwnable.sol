// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.7.0) (access/Ownable.sol)

pragma solidity ^0.8.0;

import "../utils/Context.sol";

/**
 * @devContract module that provides a multi-owner access control mechanism, where
 * there are accounts (owners) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership} or more owners can be added.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owners.
 */

/**
 * @dev Contract module that provides a multi-owner access control mechanism.
 */
abstract contract MultiOwnable is Context {
    mapping(address => bool) private _owners;
    address[] private _ownersList;

    event OwnershipAdded(address indexed newOwner);
    event OwnershipRemoved(address indexed previousOwner);

    /**
     * @dev Initializes the contract by setting the deployer as an initial owner.
     */
    constructor() {
        _addOwner(_msgSender());
    }

    /**
     * @dev Modifier to restrict access to owners.
     */
    modifier onlyOwner() {
        require(isOwner(_msgSender()), "MultiOwnable: caller is not an owner!");
        _;
    }

    /**
     * @dev Checks if an address is an owner.
     */
    function isOwner(address account) public view returns (bool) {
        return _owners[account];
    }

    /**
     * @dev Returns the list of all current owners.
     */
    function getOwners() public view returns (address[] memory) {
        return _ownersList;
    }

    /**
     * @dev Adds a new owner. Only an existing owner can call this function.
     */

    function addOwner(address newOwner) public onlyOwner {
        require(
            newOwner != address(0),
            "MultiOwnable: new owner is the zero address!"
        );
        require(!_owners[newOwner], "MultiOwnable: already an owner!");
        _addOwner(newOwner);
    }

    /**
     * @dev Removes an existing owner. Only an existing owner can call this function.
     */
    function removeOwner(address owner) public onlyOwner {
        require(
            owner != address(0),
            "MultiOwnable: owner to remove is the zero address!"
        );
        require(_owners[owner], "MultiOwnable: not an owner");
        _removeOwner(owner);
    }

    /**
     * @dev Internal function to add an owner.
     */

    function _addOwner(address newOwner) internal {
        _owners[newOwner] = true;
        _ownersList.push(newOwner);
        emit OwnershipAdded(newOwner);
    }

    /**
     * @dev Internal function to remove an owner.
     */

    function _removeOwner(address owner) internal {
        _owners[owner] = false;

        // Removing the owner from the array by finding its index and replacing it with the last element.
        for (uint i = 0; i < _ownersList.length; i++) {
            if (_ownersList[i] == owner) {
                _ownersList[i] = _ownersList[_ownersList.length - 1];
                _ownersList.pop();
                break;
            }
        }

        emit OwnershipRemoved(owner);
    }
}
