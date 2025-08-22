import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { ToastContainer } from "react-toastify";

import { config } from "./wagmi.config";
import App from "./App.tsx";
import "./index.css";
import "@rainbow-me/rainbowkit/styles.css";
import "./rainbowkit-custom.css";
import "react-toastify/dist/ReactToastify.css";

const queryClient = new QueryClient();

const customTheme = darkTheme({
  accentColor: "#ef4444",
  accentColorForeground: "#000000",
  borderRadius: "small",
  fontStack: "system",
  overlayBlur: "small",
});

const enhancedTheme = {
  ...customTheme,
  colors: {
    ...customTheme.colors,
    modalBackground: "#000000",
    modalBorder: "#ef4444",
    modalText: "#ffffff",
    modalTextSecondary: "#d1d5db",
    profileAction: "#1f1f1f",
    profileActionHover: "#2a2a2a",
    profileForeground: "#000000",
    selectedOptionBorder: "#ef4444",
    standby: "#ef4444",
  },
  fonts: {
    body: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={enhancedTheme}>
          <App />
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
            style={{
              fontSize: "14px",
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
