// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {EnclavaPayments} from "../src/EnclavaPayments.sol";

contract DeployEnclavaPayments is Script {
    function run() external {
        // Load deployer's private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Replace with the desired initial owner
        address initialOwner = vm.envAddress("INITIAL_OWNER");

        EnclavaPayments enclava = new EnclavaPayments(initialOwner);

        console.log("Deployed EnclavaPayments at:", address(enclava));

        vm.stopBroadcast();
    }
}
