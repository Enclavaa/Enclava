import { createConfig, http } from "wagmi";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  rainbowWallet,
  walletConnectWallet,
  metaMaskWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { hederaTestnet } from "viem/chains";

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
  },
);

export const config = createConfig({
  chains: [hederaTestnet],
  connectors,
  transports: {
    [hederaTestnet.id]: http(),
  },
  ssr: false,
});
