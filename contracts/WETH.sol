// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract WETH is Ownable {
    string public name;
    string public symbol;
    uint8 public decimals = 18;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    event Approval(
        address indexed sender,
        address indexed spender,
        uint256 amount
    );
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Deposit(address indexed sender, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);

    event MintWETH(address indexed sender, uint256 amount);
    event BurnWETH(address indexed sender, uint256 amount);

    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    receive() external payable {
        deposit(msg.sender);
    }

    fallback() external {
        return;
    }

    function balanceOf(address account) public view virtual returns (uint256) {
        return balances[account];
    }

    function deposit(address sender) public payable {
        emit Deposit(sender, msg.value);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        balances[to] += amount;
        emit MintWETH(to, amount);
    }

    function withdraw(address to, uint256 amount) public onlyOwner {
        payable(to).transfer(amount);
        emit Withdrawal(to, amount);
    }

    function burn(address sender, uint256 amount) public {
        require(balances[sender] >= amount, "Insufficient balance");
        balances[sender] -= amount;
        emit BurnWETH(sender, amount);
    }

    function totalSupply() public view returns (uint256) {
        return address(this).balance;
    }

    function allowance(
        address owner,
        address spender
    ) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        return transferFrom(msg.sender, to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public returns (bool) {
        require(balances[from] >= amount, "Insufficient balance");

        if (
            from != msg.sender &&
            _allowances[from][msg.sender] != type(uint256).max
        ) {
            require(
                _allowances[from][msg.sender] >= amount,
                "Allowance exceeded"
            );
            _allowances[from][msg.sender] -= amount;
        }

        balances[from] -= amount;
        balances[to] += amount;

        emit Transfer(from, to, amount);

        return true;
    }
}
