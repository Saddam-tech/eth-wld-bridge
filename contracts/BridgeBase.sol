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
    uint256 public bridgeFeeRate;
    uint256 public networkFeeRate;
    bool public emergencyStopped;
    uint public _nonce;
    //prettier-ignore
    uint256 percentage = 100 * 10**18; //=> 100 % in wei
    NetworkFee public networkFee;
    enum NetworkFeeTypes {
        NOFEE,
        TOGASASSET,
        FROMGASASSET
    }
    // no gas = 0 (no gas)
    // to gas asset = 1 (weth or wwlc)
    // from gas asset = 2 (wlc or eth)
    struct NetworkFee {
        uint id;
        address contract_address;
        string fee_type;
        uint256 amount;
    }

    constructor(
        uint256 _bridgeFeeRate,
        uint256 _networkFeeRate,
        uint networkFee_id,
        address contract_address,
        string memory networkFee_type,
        uint256 networkFee_amount
    ) {
        emergencyStopped = false;
        networkFeeRate = _networkFeeRate;
        bridgeFeeRate = _bridgeFeeRate;
        uint256 _networkFee_amount = networkFee_amount.mul(networkFeeRate).div(
            percentage
        );
        networkFee = NetworkFee(
            networkFee_id,
            contract_address,
            networkFee_type,
            _networkFee_amount
        );
    }

    modifier notInEmergency() {
        require(!emergencyStopped, "Contract is in emergency state!");
        _;
    }

    event LockToken(
        address from,
        address to,
        uint256 bridgeFee,
        uint256 amount,
        address token,
        uint date,
        uint256 nonce,
        address networkFee_contract_address,
        uint256 networkFee_amount
    );

    event BurnToken(
        address from,
        address to,
        uint256 bridgeFee,
        uint256 amount,
        address token,
        uint date,
        uint256 nonce,
        address networkFee_contract_address,
        uint256 networkFee_amount
    );

    event LockETH(
        address from,
        address to,
        uint256 bridgeFee,
        uint256 amount,
        address token,
        uint date,
        uint256 nonce,
        address networkFee_contract_address,
        uint256 networkFee_amount
    );
    event BurnWETH(
        address from,
        address to,
        uint256 bridgeFee,
        uint256 amount,
        address token,
        uint date,
        uint256 nonce,
        address networkFee_contract_address,
        uint256 networkFee_amount
    );

    receive() external payable {}

    function emergencyStop() external onlyOwner {
        emergencyStopped = true;
    }

    function resume() external onlyOwner {
        emergencyStopped = false;
    }

    function castEnum(NetworkFeeTypes feeType) public pure returns (uint) {
        return uint(feeType);
    }

    function setBridgeFeeRate(uint256 rate) external onlyOwner {
        bridgeFeeRate = rate; // % in wei
    }

    function setNetworkFeeRate(uint256 rate) external onlyOwner {
        networkFeeRate = rate; // % in wei
    }

    function setNetworkFee(
        uint id,
        address contract_address,
        string calldata fee_type,
        uint256 fee
    ) external onlyOwner {
        uint256 _fee = fee.mul(networkFeeRate).div(percentage);
        networkFee = NetworkFee(id, contract_address, fee_type, _fee);
    }

    function getBridgeFee(uint256 amountIn) public view returns (uint256 fee) {
        return amountIn.mul(bridgeFeeRate).div(percentage);
    }

    function resetProcessedNonces(
        uint256 from,
        uint256 to,
        bool state
    ) external onlyOwner {
        require(to >= from, "Invalid range!");

        for (uint i = from; i < to; i++) {
            processedNonces[i] = state;
        }
    }

    // TOKEN

    function mintToken(
        address[] calldata destinations,
        uint256[] calldata amounts,
        uint256[] calldata nonces,
        address[] calldata tokens,
        bytes calldata signature
    ) external onlyOwner notInEmergency nonReentrant {
        bytes32 message = prefixed(
            keccak256(
                abi.encodePacked(
                    destinations[0],
                    amounts[0],
                    nonces[0],
                    tokens[0]
                )
            )
        );
        require(
            recoverSigner(message, signature) == owner(),
            "Wrong signature!"
        );
        // mint transaction amounts to destinations
        for (uint256 i = 0; i < amounts.length; i++) {
            require(!processedNonces[nonces[i]], "Mint already processed!");
            processedNonces[nonces[i]] = true;
            IToken(tokens[i]).mint(destinations[i], amounts[i]);
        }
    }

    function burnToken(
        address to,
        uint256 bridgeCalcFee,
        uint256 amount,
        address token
    ) external payable notInEmergency nonReentrant {
        require(
            IToken(token).allowance(msg.sender, address(this)) > amount,
            "Insufficient allowance!"
        );
        uint256 afterFee = amount.sub(bridgeCalcFee);
        uint256 _bridgeCalcFee = getBridgeFee(afterFee);
        require(bridgeCalcFee == _bridgeCalcFee, "Insufficient bridge fee!");
        require(
            IToken(token).transferFrom(msg.sender, owner(), bridgeCalcFee), // bridge fee transfer
            "Transfer to owner failed! (bridge fee)"
        );
        if (networkFee.id == castEnum(NetworkFeeTypes.TOGASASSET)) {
            require(
                IWETH(networkFee.contract_address).balanceOf(msg.sender) >=
                    networkFee.amount,
                "Insufficient balance for the network fee!"
            );
            require(
                IWETH(networkFee.contract_address).transferFrom(
                    msg.sender,
                    owner(),
                    networkFee.amount
                ), // network fee transfer
                "Transfer to owner failed! (network fee)"
            );
        } else if (networkFee.id == castEnum(NetworkFeeTypes.FROMGASASSET)) {
            (bool _success, ) = owner().call{value: networkFee.amount}("");
            require(_success, "Transfer to owner failed! (network fee)");
        }
        IToken(token).burn(msg.sender, afterFee);
        emit BurnToken(
            msg.sender,
            to,
            bridgeCalcFee,
            afterFee,
            token,
            block.timestamp,
            _nonce,
            networkFee.contract_address,
            networkFee.amount
        );
        _nonce++;
    }

    function lockToken(
        address to,
        uint256 bridgeCalcFee,
        address token,
        uint256 amount
    ) external payable notInEmergency nonReentrant {
        require(
            IToken(token).allowance(msg.sender, address(this)) > amount,
            "Insufficient allowance!"
        );
        uint256 afterFee = amount.sub(bridgeCalcFee);
        uint256 _bridgeCalcFee = getBridgeFee(afterFee);
        require(bridgeCalcFee == _bridgeCalcFee, "Insufficient bridge fee!");
        require(
            IToken(token).transferFrom(msg.sender, owner(), bridgeCalcFee), // bridge fee transfer
            "Transfer to owner failed! (bridge fee)"
        );
        if (networkFee.id == castEnum(NetworkFeeTypes.TOGASASSET)) {
            require(
                IWETH(networkFee.contract_address).balanceOf(msg.sender) >=
                    networkFee.amount,
                "Insufficient balance for the network fee!"
            );
            require(
                IWETH(networkFee.contract_address).transferFrom(
                    msg.sender,
                    owner(),
                    networkFee.amount
                ), // network fee transfer
                "Transfer to owner failed! (network fee)"
            );
        } else if (networkFee.id == castEnum(NetworkFeeTypes.FROMGASASSET)) {
            (bool _success, ) = owner().call{value: networkFee.amount}("");
            require(_success, "Transfer to owner failed! (network fee)");
        }
        require(
            IToken(token).transferFrom(msg.sender, address(this), afterFee),
            "Lock failed"
        );
        emit LockToken(
            msg.sender,
            to,
            bridgeCalcFee,
            afterFee,
            token,
            block.timestamp,
            _nonce,
            networkFee.contract_address,
            networkFee.amount
        );
        _nonce++;
    }

    function unlockToken(
        address[] calldata destinations,
        uint256[] calldata amounts,
        uint256[] calldata nonces,
        address[] calldata tokens,
        bytes calldata signature
    ) external onlyOwner notInEmergency nonReentrant {
        bytes32 message = prefixed(
            keccak256(
                abi.encodePacked(
                    destinations[0],
                    amounts[0],
                    nonces[0],
                    tokens[0]
                )
            )
        );
        require(
            recoverSigner(message, signature) == owner(),
            "Wrong signature!"
        );
        // unlock transaction amounts to destinations
        for (uint256 i = 0; i < amounts.length; i++) {
            require(
                IToken(tokens[i]).balanceOf(address(this)) >= amounts[i],
                "Insufficient contract balance!"
            );
            require(!processedNonces[nonces[i]], "UnLock already processed!");
            processedNonces[nonces[i]] = true;
            IToken(tokens[i]).transfer(destinations[i], amounts[i]);
        }
    }

    // WRAPPED ETHER

    // lock coin

    function lockETH(
        address to,
        address token,
        uint256 bridgeCalcFee
    ) external payable notInEmergency nonReentrant {
        uint256 afterFee = msg.value.sub(bridgeCalcFee);
        uint256 _bridgeCalcFee = getBridgeFee(afterFee);
        require(bridgeCalcFee == _bridgeCalcFee, "Insufficient bridge fee!");
        (bool success, ) = owner().call{value: bridgeCalcFee}(""); // bridge fee transfer
        require(success, "Transfer to owner failed! (bridge fee)");
        if (networkFee.id == castEnum(NetworkFeeTypes.TOGASASSET)) {
            require(
                IWETH(networkFee.contract_address).balanceOf(msg.sender) >=
                    networkFee.amount,
                "Insufficient balance for the network fee!"
            );
            require(
                IWETH(networkFee.contract_address).transferFrom(
                    msg.sender,
                    owner(),
                    networkFee.amount
                ), // network fee transfer
                "Transfer to owner failed! (network fee)"
            );
        } else if (networkFee.id == castEnum(NetworkFeeTypes.FROMGASASSET)) {
            (bool _success, ) = owner().call{value: networkFee.amount}("");
            require(_success, "Transfer to owner failed! (network fee)");
        }
        IWETH(token).deposit{value: afterFee}(msg.sender); // lock
        emit LockETH(
            msg.sender,
            to,
            bridgeCalcFee,
            afterFee,
            token,
            block.timestamp,
            _nonce,
            networkFee.contract_address,
            networkFee.amount
        );
        _nonce++;
    }

    function unLockETH(
        address[] calldata destinations,
        uint256[] calldata amounts,
        uint256[] calldata nonces,
        address[] calldata tokens,
        bytes calldata signature
    ) external onlyOwner notInEmergency nonReentrant {
        bytes32 message = prefixed(
            keccak256(
                abi.encodePacked(
                    destinations[0],
                    amounts[0],
                    nonces[0],
                    tokens[0]
                )
            )
        );
        require(
            recoverSigner(message, signature) == owner(),
            "Wrong signature!"
        );
        // unlock transaction amounts to destinations
        for (uint256 i = 0; i < amounts.length; i++) {
            require(!processedNonces[nonces[i]], "UnLock already processed!");
            processedNonces[nonces[i]] = true;
            IWETH(tokens[i]).withdraw(destinations[i], amounts[i]);
        }
    }

    function mintWETH(
        address[] calldata destinations,
        uint256[] calldata amounts,
        uint256[] calldata nonces,
        address[] calldata tokens,
        bytes calldata signature
    ) external onlyOwner notInEmergency nonReentrant {
        bytes32 message = prefixed(
            keccak256(
                abi.encodePacked(
                    destinations[0],
                    amounts[0],
                    nonces[0],
                    tokens[0]
                )
            )
        );
        require(
            recoverSigner(message, signature) == owner(),
            "Wrong signature!"
        );
        // mint transaction amounts to destinations
        for (uint256 i = 0; i < amounts.length; i++) {
            require(!processedNonces[nonces[i]], "Mint already processed!");
            processedNonces[nonces[i]] = true;
            IWETH(tokens[i]).mint(destinations[i], amounts[i]);
        }
    }

    function burnWETH(
        address to,
        uint256 bridgeCalcFee,
        uint256 amount,
        address token
    ) external payable notInEmergency nonReentrant {
        require(
            IWETH(token).allowance(msg.sender, address(this)) > amount,
            "Insufficient allowance!"
        );
        uint256 afterFee = amount.sub(bridgeCalcFee);
        uint256 _bridgeCalcFee = getBridgeFee(afterFee);
        require(bridgeCalcFee == _bridgeCalcFee, "Insufficient bridge fee!");
        require(
            IWETH(token).transferFrom(msg.sender, owner(), bridgeCalcFee), // bridge fee transfer
            "Transfer to owner failed! (bridge fee)"
        );
        if (networkFee.id == castEnum(NetworkFeeTypes.TOGASASSET)) {
            require(
                IWETH(networkFee.contract_address).balanceOf(msg.sender) >=
                    networkFee.amount,
                "Insufficient balance for the network fee!"
            );
            require(
                IWETH(networkFee.contract_address).transferFrom(
                    msg.sender,
                    owner(),
                    networkFee.amount
                ), // network fee transfer
                "Transfer to owner failed! (network fee)"
            );
        } else if (networkFee.id == castEnum(NetworkFeeTypes.FROMGASASSET)) {
            (bool _success, ) = owner().call{value: networkFee.amount}("");
            require(_success, "Transfer to owner failed! (network fee)");
        }
        IWETH(token).burn(msg.sender, afterFee);
        emit BurnWETH(
            msg.sender,
            to,
            bridgeCalcFee,
            afterFee,
            token,
            block.timestamp,
            _nonce,
            networkFee.contract_address,
            networkFee.amount
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

    function extractLockedTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        IToken(token).transfer(to, amount);
    }

    function extractLockedETH(
        address _address,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        IWETH(_address).withdraw(to, amount);
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
