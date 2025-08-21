#!/bin/bash

echo "Deploying EnclavaPayments to testnet..."

forge script script/DeployEnclavaPayments.s.sol:DeployEnclavaPayments \
  --rpc-url sei_testnet \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://seitrace.com/atlantic-2/api \
  --compiler-version 0.8.30 \
  --chain-id 1328


echo -e "\n\nDeployed EnclavaPayments to testnet!"