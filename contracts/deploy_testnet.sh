#!/bin/bash

echo "Deploying EnclavaPayments to testnet..."

forge script script/DeployEnclavaPayments.s.sol:DeployEnclavaPayments \
  --rpc-url hedera_testnet \
  --broadcast \
  --compiler-version 0.8.30 \
  --chain-id 296


echo -e "\n\nDeployed EnclavaPayments to testnet!"