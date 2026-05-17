// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Lending Pool
/// @notice Manages over-collateralized lending and risk metrics.
contract LendingPool {
    struct UserAccount {
        uint256 collateral;
        uint256 borrowed;
    }

    mapping(address => UserAccount) public accounts;
    /// @notice The LTV threshold (80%) before liquidation.
    uint256 public constant LIQUIDATION_THRESHOLD = 80;

    function depositCollateral(address asset, uint256 amount) external {
        require(IERC20(asset).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        accounts[msg.sender].collateral += amount;
    }

    function borrow(address asset, uint256 amount) external {
        uint256 maxBorrow = (accounts[msg.sender].collateral * LIQUIDATION_THRESHOLD) / 100;
        require(accounts[msg.sender].borrowed + amount <= maxBorrow, "Insufficient collateral");
        accounts[msg.sender].borrowed += amount;
        require(IERC20(asset).transfer(msg.sender, amount), "Transfer failed");
    }
}
