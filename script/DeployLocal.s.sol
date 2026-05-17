// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GovernanceToken} from "src/governance/GovernanceToken.sol";
import {DSATimelock} from "src/governance/DSATimelock.sol";
import {DSAGovernor} from "src/governance/DSAGovernor.sol";
import {AMMFactory} from "src/AMMFactory.sol";
import {LendingPool} from "src/LendingPool.sol";
import {YieldVault} from "src/YieldVault.sol";

contract DeployLocal is Script {
    function run() external {
        uint256 deployerPrivateKey =
            vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        GovernanceToken token = new GovernanceToken("DSA Token", "DSA", deployer, 1000 ether);
        console.log("GovernanceToken deployed to:", address(token));

        // Deploy and Initialize AMM Factory
        AMMFactory factory = new AMMFactory();
        factory.initialize(deployer);
        console.log("AMMFactory deployed and initialized at:", address(factory));

        // Deploy Lending and Yield Infrastructure
        LendingPool lendingPool = new LendingPool();
        console.log("LendingPool deployed to:", address(lendingPool));

        YieldVault vault = new YieldVault(token, "Yield DSA", "yDSA");
        console.log("YieldVault deployed to:", address(vault));

        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](0);
        DSATimelock timelock = new DSATimelock(2 days, proposers, executors, deployer);
        console.log("DSATimelock deployed to:", address(timelock));

        DSAGovernor governor = new DSAGovernor(token, timelock);
        console.log("DSAGovernor deployed to:", address(governor));

        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(0));

        timelock.revokeRole(timelock.DEFAULT_ADMIN_ROLE(), deployer);

        vm.stopBroadcast();
    }
}
