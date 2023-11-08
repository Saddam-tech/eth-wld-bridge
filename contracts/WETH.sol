// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract WETH is Ownable {
    string public name = "Wrapped Ether";
    string public symbol = "WETH";
    uint8 public decimals = 18;

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
    mapping(address => mapping(address => uint)) public allowance;

    // receive() external payable {
    // deposit();
    // }

    fallback() external {
        return;
    }

    function deposit(address sender, uint256 amount) public payable {
        emit Deposit(sender, amount);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        balanceOf[to] += amount;
        emit MintWETH(to, amount);
    }

    function withdraw(address to, uint256 amount) public onlyOwner {
        require(balanceOf[to] >= amount, "Balance is low!");
        balanceOf[to] -= amount;
        payable(to).transfer(amount);
        emit Withdrawal(to, amount);
    }

    function burn(address sender, uint256 amount) public {
        require(balanceOf[sender] > amount, "Balance is low!");
        balanceOf[sender] -= amount;
        emit BurnWETH(sender, amount);
    }

    function totalSupply() public view returns (uint) {
        return address(this).balance;
    }

    function approve(address spender, uint amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
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
            allowance[from][msg.sender] != type(uint256).max
        ) {
            require(
                allowance[from][msg.sender] >= amount,
                "Allowance exceeded"
            );
            allowance[from][msg.sender] -= amount;
        }

        balanceOf[from] -= amount;
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);

        return true;
    }
}
