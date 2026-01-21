import React from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Home,
  ShoppingBag,
  Upload,
  User,
  History,
  MessageCircle,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

interface SidebarProps {}

export const Sidebar: React.FC<SidebarProps> = () => {
  const { isConnected } = useAccount();
  const location = useLocation();
  const currentPage = location.pathname.split("/")[1] || "home";

  const navigationItems = [
    { path: "/", label: "Home", icon: Home, key: "" },
    {
      path: "/marketplace",
      label: "Marketplace",
      icon: ShoppingBag,
      key: "marketplace",
    },
    ...(isConnected
      ? [
          {
            path: "/upload-dataset",
            label: "Upload Dataset",
            icon: Upload,
            key: "upload-dataset",
          },
          {
            path: "/chat",
            label: "AI Chat",
            icon: MessageCircle,
            key: "chat",
          },
          { path: "/profile", label: "Profile", icon: User, key: "profile" },
          {
            path: "/transactions",
            label: "Transactions",
            icon: History,
            key: "transactions",
          },
        ]
      : []),
  ];

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-black border-r-4 border-violet-500">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b-2 border-violet-500">
          <img
            src="/images/logo.png"
            alt="Enclava Logo"
            className="h-8 w-8 mr-3"
          />
          <Link
            to="/"
            className="font-black text-xl uppercase cursor-pointer text-white hover:text-violet-500 transition-colors"
          >
            ENCLAVA
          </Link>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex-1 px-4 space-y-2">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentPage === item.key;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-mono uppercase font-black border-2 transition-colors rounded-md ${
                  isActive
                    ? "border-violet-500 bg-violet-500 text-black"
                    : "border-white text-white hover:bg-white hover:text-black"
                }`}
              >
                <IconComponent size={20} className="mr-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Connect Wallet Button */}
        <div className="p-4 border-t-2 border-violet-500">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== "loading";
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === "authenticated");

              return (
                <div
                  {...(!ready && {
                    "aria-hidden": true,
                    style: {
                      opacity: 0,
                      pointerEvents: "none",
                      userSelect: "none",
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          type="button"
                          className="w-full flex items-center justify-center px-4 py-3 bg-violet-500 text-black font-black border-2 border-violet-500 hover:bg-white hover:text-black transition-colors uppercase rounded-md"
                        >
                          <span>Connect Wallet</span>
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="w-full flex items-center justify-center px-4 py-3 bg-yellow-500 text-black font-black border-2 border-yellow-500 hover:bg-white hover:text-black transition-colors uppercase rounded-md"
                        >
                          Wrong Network
                        </button>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="w-full flex items-center justify-center px-4 py-2 bg-gray-700 text-white font-black border-2 border-gray-700 hover:bg-white hover:text-black transition-colors uppercase rounded-md text-sm"
                        >
                          {chain.hasIcon && (
                            <div
                              style={{
                                background: chain.iconBackground,
                                width: 16,
                                height: 16,
                                borderRadius: 999,
                                overflow: "hidden",
                                marginRight: 8,
                              }}
                            >
                              {chain.iconUrl && (
                                <img
                                  alt={chain.name ?? "Chain icon"}
                                  src={chain.iconUrl}
                                  style={{ width: 16, height: 16 }}
                                />
                              )}
                            </div>
                          )}
                          {chain.name}
                        </button>

                        <button
                          onClick={openAccountModal}
                          type="button"
                          className="w-full flex items-center justify-center px-4 py-3 bg-violet-500 text-black font-black border-2 border-violet-500 hover:bg-white hover:text-black transition-colors uppercase rounded-md"
                        >
                          <span>
                            {account.displayName}
                            {account.displayBalance
                              ? ` (${account.displayBalance})`
                              : ""}
                          </span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </div>
  );
};
