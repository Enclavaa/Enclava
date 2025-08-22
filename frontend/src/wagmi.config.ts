import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  rainbowWallet,
  walletConnectWallet,
  metaMaskWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";

//  Sei testnet chain
export const seiTestnet = defineChain({
  id: 1328,
  name: "Sei Testnet",
  network: "sei-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "SEI",
    symbol: "SEI",
  },
  rpcUrls: {
    default: {
      http: ["https://evm-rpc-testnet.sei-apis.com"],
    },
    public: {
      http: ["https://evm-rpc-testnet.sei-apis.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Seitrace",
      url: "https://seitrace.com",
    },
  },
  testnet: true,
});

// wallet connectors
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        injectedWallet,
        rainbowWallet,
        metaMaskWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: "Enclava",
    projectId: "8d0f880bcadda7b5b3fa580f76de67da",
  }
);

export const config = createConfig({
  chains: [seiTestnet],
  connectors,
  transports: {
    [seiTestnet.id]: http(),
  },
  ssr: false,
});
