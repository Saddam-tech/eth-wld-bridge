// SPDX-License-Identifier: MIT

pragma solidity =0.8.0;

contract WrapETH {
    address owner;
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    mapping(address => mapping(uint256 => bool)) public processedNonces;

    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 amount
    );
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 nonce
    );

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 public totalSupply;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        totalSupply = 0;
        owner = msg.sender;
    }

    function deposit(uint256 nonce) public payable {
        balanceOf[msg.sender] += msg.value;
        totalSupply += msg.value;
        require(
            processedNonces[msg.sender][nonce] == false,
            "Transfer already processed!"
        );
        processedNonces[msg.sender][nonce] = true;
        emit Transfer(address(0), msg.sender, msg.value, nonce);
    }

    function mint(uint256 amount, address sender, uint256 nonce) public {
        require(msg.sender == owner, "Only admin!");
        require(
            processedNonces[msg.sender][nonce] == false,
            "Transfer already processed!"
        );
        processedNonces[msg.sender][nonce] = true;
        balanceOf[sender] += amount;
        totalSupply += amount;
    }

    function withdraw(uint256 amount, uint256 nonce) public {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        require(
            processedNonces[msg.sender][nonce] == false,
            "Transfer already processed!"
        );
        processedNonces[msg.sender][nonce] = true;
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        payable(msg.sender).transfer(amount);
        emit Transfer(msg.sender, address(0), amount, nonce);
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(
        address to,
        uint256 amount,
        uint256 nonce
    ) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount, nonce);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount,
        uint256 nonce
    ) public returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(
            allowance[from][msg.sender] >= amount,
            "Insufficient allowance"
        );
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount, nonce);
        return true;
    }
}
