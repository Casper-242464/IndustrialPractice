// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Yield Vault (ERC-4626)
/// @notice Aggregates capital to maximize utilization across lending primitives.
contract YieldVault is ERC4626 {
    constructor(IERC20 asset, string memory name, string memory symbol) 
        ERC4626(asset) 
        ERC20(name, symbol) 
    {}
}