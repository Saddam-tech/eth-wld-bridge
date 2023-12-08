// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./WETH.sol";
import "./IWETH.sol";
import "./IToken.sol";

contract BridgeBase is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    mapping(uint256 => bool) public processedNonces;
    uint256 public feeRate;
    bool public emergencyStopped;
    uint public _nonce;
    //prettier-ignore
    uint256 percentage = 10**18;

    constructor(uint256 _feeRate) {
        emergencyStopped = false;
        feeRate = _feeRate;
    }

    modifier notInEmergency() {
        require(!emergencyStopped, "Contract is in emergency state!");
        _;
    }

    event LockToken(
        address from,
        address to,
        uint256 amount,
        address token,
        uint date,
        string tokenType,
        uint256 nonce
    );

    event BurnToken(
        address from,
        address to,
        uint256 amount,
        address token,
        uint date,
        string tokenType,
        uint256 nonce
    );

    event LockETH(
        address from,
        address to,
        uint256 amount,
        address token,
        uint date,
        uint256 nonce
    );
    event BurnWETH(
        address from,
        address to,
        uint256 amount,
        address token,
        uint date,
        uint256 nonce
    );

    receive() external payable {}

    function emergencyStop() external onlyOwner {
        emergencyStopped = true;
    }

    function resume() external onlyOwner {
        emergencyStopped = false;
    }

    function setFeeRate(uint256 rate) external onlyOwner {
        feeRate = rate;
    }

    // TOKEN

    function mintToken(
        address[] calldata destinations,
        uint256[] calldata amounts,
        uint256[] calldata nonces,
        address token,
        bytes calldata signature
    ) external onlyOwner notInEmergency nonReentrant {
        bytes32 message = prefixed(keccak256(abi.encodePacked(token)));
        require(
            recoverSigner(message, signature) == owner(),
            "Wrong signature!"
        );
        // mint transaction amounts to destinations
        for (uint256 i = 0; i < amounts.length; i++) {
            require(!processedNonces[nonces[i]], "Mint already processed!");
            processedNonces[nonces[i]] = true;
            IToken(token).mint(destinations[i], amounts[i]);
        }
    }

    function burnToken(
        address to,
        uint256 amount,
        address token,
        string calldata tokenType
    ) external notInEmergency nonReentrant {
        require(
            IToken(token).allowance(msg.sender, address(this)) > amount,
            "Insufficient allowance!"
        );
        uint256 fee = amount.mul(feeRate).div(percentage);
        uint256 afterFee = amount.sub(fee);
        require(fee > 0, "Fee should be greater than zero!");
        IToken(token).transferFrom(msg.sender, owner(), fee);
        IToken(token).burn(msg.sender, afterFee);
        emit BurnToken(
            msg.sender,
            to,
            afterFee,
            token,
            block.timestamp,
            tokenType,
            _nonce
        );
        _nonce++;
    }

    function lockToken(
        address to,
        uint256 amount,
        string calldata tokenType,
        address token
    ) external notInEmergency nonReentrant {
        require(
            IToken(token).allowance(msg.sender, address(this)) > amount,
            "Insufficient allowance!"
        );
        uint256 fee = amount.mul(feeRate).div(percentage);
        uint256 afterFee = amount.sub(fee);
        require(fee > 0, "Fee should be greater than zero!");
        IToken(token).transferFrom(msg.sender, owner(), fee);
        require(
            IToken(token).transferFrom(msg.sender, address(this), afterFee),
            "Lock failed"
        );
        emit LockToken(
            msg.sender,
            to,
            afterFee,
            token,
            block.timestamp,
            tokenType,
            _nonce
        );
        _nonce++;
    }

    function unlockToken(
        address[] calldata destinations,
        uint256[] calldata amounts,
        uint256[] calldata nonces,
        address token,
        bytes calldata signature
    ) external onlyOwner notInEmergency nonReentrant {
        bytes32 message = prefixed(keccak256(abi.encodePacked(token)));
        require(
            recoverSigner(message, signature) == owner(),
            "Wrong signature!"
        );
        // unlock transaction amounts to destinations
        for (uint256 i = 0; i < amounts.length; i++) {
            require(
                IToken(token).balanceOf(address(this)) >= amounts[i],
                "Insufficient contract balance!"
            );
            require(!processedNonces[nonces[i]], "UnLock already processed!");
            processedNonces[nonces[i]] = true;
            IToken(token).transfer(destinations[i], amounts[i]);
        }
    }

    // WRAPPED ETHER

    function lockETH(
        address to,
        address token
    ) external payable notInEmergency nonReentrant {
        uint256 fee = msg.value.mul(feeRate).div(percentage);
        uint256 afterFee = msg.value.sub(fee);
        require(fee > 0, "Fee should be greater than zero!");
        (bool success, ) = owner().call{value: fee}("");
        require(success, "Transfer to owner failed!");
        IWETH(token).deposit{value: afterFee}(msg.sender);
        emit LockETH(msg.sender, to, afterFee, token, block.timestamp, _nonce);
        _nonce++;
    }

    function unLockETH(
        address[] calldata destinations,
        uint256[] calldata amounts,
        uint256[] calldata nonces,
        address token,
        bytes calldata signature
    ) external onlyOwner notInEmergency nonReentrant {
        bytes32 message = prefixed(keccak256(abi.encodePacked(token)));
        require(
            recoverSigner(message, signature) == owner(),
            "Wrong signature!"
        );
        // unlock transaction amounts to destinations
        for (uint256 i = 0; i < amounts.length; i++) {
            require(!processedNonces[nonces[i]], "UnLock already processed!");
            processedNonces[nonces[i]] = true;
            IWETH(token).withdraw(destinations[i], amounts[i]);
        }
    }

    function mintWETH(
        address[] calldata destinations,
        uint256[] calldata amounts,
        uint256[] calldata nonces,
        address token,
        bytes calldata signature
    ) external onlyOwner notInEmergency nonReentrant {
        bytes32 message = prefixed(keccak256(abi.encodePacked(token)));
        require(
            recoverSigner(message, signature) == owner(),
            "Wrong signature!"
        );
        // mint transaction amounts to destinations
        for (uint256 i = 0; i < amounts.length; i++) {
            require(!processedNonces[nonces[i]], "Mint already processed!");
            processedNonces[nonces[i]] = true;
            IWETH(token).mint(destinations[i], amounts[i]);
        }
    }

    function burnWETH(
        uint256 amount,
        address token
    ) external notInEmergency nonReentrant {
        require(
            IWETH(token).allowance(msg.sender, address(this)) > amount,
            "Insufficient allowance!"
        );
        uint256 fee = amount.mul(feeRate).div(percentage);
        uint256 afterFee = amount.sub(fee);
        require(fee > 0, "Fee should be greater than zero!");
        IWETH(token).transferFrom(msg.sender, owner(), fee);
        IWETH(token).burn(msg.sender, afterFee);
        emit BurnWETH(
            msg.sender,
            msg.sender,
            afterFee,
            token,
            block.timestamp,
            _nonce
        );
        _nonce++;
    }

    function transferOwnershipOfWETH(
        address token,
        address newOwner
    ) external onlyOwner nonReentrant {
        IToken(token).transferOwnership(newOwner);
    }

    function transferOwnershipOfERC20Custom(
        address token,
        address newOwner
    ) external onlyOwner nonReentrant {
        IWETH(token).transferOwnership(newOwner);
    }

    // utils

    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
            );
    }

    function recoverSigner(
        bytes32 message,
        bytes memory sig
    ) internal pure returns (address) {
        uint8 v;
        bytes32 r;
        bytes32 s;

        (v, r, s) = splitSignature(sig);

        return ecrecover(message, v, r, s);
    }

    function splitSignature(
        bytes memory sig
    ) internal pure returns (uint8, bytes32, bytes32) {
        require(sig.length == 65);
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }
}
