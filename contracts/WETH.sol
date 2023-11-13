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
        uint amount
    );
    event Transfer(address indexed from, address indexed to, uint amount);
    event Deposit(address indexed sender, uint amount);
    event Withdrawal(address indexed to, uint amount);

    event MintWETH(address indexed sender, uint256 amount);
    event BurnWETH(address indexed sender, uint256 amount);

    mapping(address => uint) public balanceOf;
    mapping(address => uint) public c_balanceOf;
    mapping(address => mapping(address => uint)) private _allowances;

    // receive() external payable {
    // deposit();
    // }

    fallback() external {
        return;
    }

    function deposit(address sender) public payable {
        c_balanceOf[msg.sender] += msg.value;
        emit Deposit(sender, msg.value);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        balanceOf[to] += amount;
        emit MintWETH(to, amount);
    }

    function withdraw(address to, uint256 amount) public onlyOwner {
        require(c_balanceOf[to] >= amount, "Insufficient balance");
        c_balanceOf[to] -= amount;
        payable(to).transfer(amount);
        emit Withdrawal(to, amount);
    }

    function burn(address sender, uint256 amount) public {
        require(balanceOf[sender] >= amount, "Insufficient balance");
        balanceOf[sender] -= amount;
        emit BurnWETH(sender, amount);
    }

    function totalSupply() public view returns (uint) {
        return address(this).balance;
    }

    function allowance(
        address owner,
        address spender
    ) public view virtual returns (uint) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint amount) public returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint amount) public returns (bool) {
        return transferFrom(msg.sender, to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint amount
    ) public returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");

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

        balanceOf[from] -= amount;
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);

        return true;
    }
}
