// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ERC4626Vault is ERC4626, Ownable {
    uint256 public constant MIN_INITIAL_DEPOSIT = 10 ** 3;

    error DepositTooLow();
    error EmergencyWithdrwaWithActiveProtocol();

    constructor(IERC20 _underlyingAsset, string memory _name, string memory _symbol)
        ERC20(_name, _symbol)
        ERC4626(_underlyingAsset)
        Ownable(msg.sender)
    {}

    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        // slither-disable-next-line incorrect-equality
        if (totalSupply() == 0 && assets < MIN_INITIAL_DEPOSIT) {
            revert DepositTooLow();
        }
        return super.deposit(assets, receiver);
    }

    function mint(uint256 shares, address receiver) public override returns (uint256) {
        uint256 assets = previewMint(shares);
        // slither-disable-next-line incorrect-equality
        if (totalSupply() == 0 && assets < MIN_INITIAL_DEPOSIT) {
            revert DepositTooLow();
        }
        return super.mint(shares, receiver);
    }

    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }
}
