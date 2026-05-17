// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {GovernanceToken} from "src/governance/GovernanceToken.sol";
import {DSATimelock} from "src/governance/DSATimelock.sol";
import {DSAGovernor} from "src/governance/DSAGovernor.sol";
import {AMMFactory} from "src/AMMFactory.sol";
import {LendingPool} from "src/LendingPool.sol";
import {YieldVault} from "src/YieldVault.sol";

contract DeployL2 is Script {
    function run() external {
        // Fetch deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying protocol to L2 with deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Governance Token
        GovernanceToken token = new GovernanceToken("DSA Token", "DSA", deployer, 1000 ether);
        console.log("GovernanceToken deployed to:", address(token));

        // 2. Deploy AMM Infrastructure (UUPS Proxy Pattern)
        AMMFactory factoryImplementation = new AMMFactory();
        bytes memory initData = abi.encodeWithSelector(
            AMMFactory.initialize.selector,
            deployer
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(factoryImplementation), initData);
        AMMFactory factory = AMMFactory(address(proxy));
        console.log("AMMFactory Proxy deployed to:", address(factory));

        // 3. Deploy Lending & Yield Infrastructure
        LendingPool lendingPool = new LendingPool();
        console.log("LendingPool deployed to:", address(lendingPool));

        YieldVault vault = new YieldVault(token, "Yield DSA", "yDSA");
        console.log("YieldVault deployed to:", address(vault));

        // 4. Deploy Governance Infrastructure
        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](0);
        DSATimelock timelock = new DSATimelock(2 days, proposers, executors, deployer);
        console.log("DSATimelock deployed to:", address(timelock));

        DSAGovernor governor = new DSAGovernor(token, timelock);
        console.log("DSAGovernor deployed to:", address(governor));

        // 5. Setup Permissions
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(0)); // Open execution after delay

        // Renounce ownership of Timelock to itself/Governance for decentralization
        timelock.revokeRole(timelock.DEFAULT_ADMIN_ROLE(), deployer);
        console.log("Permissions configured and Timelock admin role revoked from deployer.");

        vm.stopBroadcast();
    }
}