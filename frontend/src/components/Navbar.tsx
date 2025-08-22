import React, { useState } from "react";
import {
  Menu,
  X,
  Home,
  ShoppingBag,
  Upload,
  User,
  History,
  MessageCircle,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

import { useLocation, Link } from "react-router-dom";

interface NavbarProps {}

export const Navbar: React.FC<NavbarProps> = () => {
  const { isConnected } = useAccount();
  const location = useLocation();
  const currentPage = location.pathname.split("/")[1] || "home";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const mobileNavigationItems = [
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
    <nav className="lg:hidden bg-black text-white border-b-4 border-red-500 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <img
              src="/images/logo.png"
              alt="Enclava Logo"
              className="h-8 w-8 mr-3"
            />
            <Link
              to="/"
              className="font-black text-2xl uppercase cursor-pointer hover:text-red-500 transition-colors"
            >
              ENCLAVA
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="border-2 border-white p-2 hover:bg-white hover:text-black transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="mt-4 border-t-2 border-red-500 pt-4">
            <div className="flex flex-col space-y-4">
              {mobileNavigationItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentPage === item.key;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center font-mono uppercase font-black px-4 py-2 border-2 transition-colors text-left ${
                      isActive
                        ? "border-red-500 bg-red-500 text-black"
                        : "border-white hover:bg-white hover:text-black"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <IconComponent size={20} className="mr-3" />
                    {item.label}
                  </Link>
                );
              })}

              <div className="connect-button-container">
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
                                className="flex items-center justify-center space-x-2 bg-red-500 text-black font-black px-6 py-3 border-2 border-red-500 hover:bg-white hover:text-black transition-colors uppercase"
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
                                className="flex items-center justify-center space-x-2 bg-yellow-500 text-black font-black px-6 py-3 border-2 border-yellow-500 hover:bg-white hover:text-black transition-colors uppercase"
                              >
                                Wrong network
                              </button>
                            );
                          }

                          return (
                            <div className="flex gap-2">
                              <button
                                onClick={openChainModal}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                }}
                                type="button"
                                className="bg-gray-700 text-white font-black px-4 py-2 border-2 border-gray-700 hover:bg-white hover:text-black transition-colors uppercase text-sm"
                              >
                                {chain.hasIcon && (
                                  <div
                                    style={{
                                      background: chain.iconBackground,
                                      width: 12,
                                      height: 12,
                                      borderRadius: 999,
                                      overflow: "hidden",
                                      marginRight: 4,
                                    }}
                                  >
                                    {chain.iconUrl && (
                                      <img
                                        alt={chain.name ?? "Chain icon"}
                                        src={chain.iconUrl}
                                        style={{ width: 12, height: 12 }}
                                      />
                                    )}
                                  </div>
                                )}
                                {chain.name}
                              </button>

                              <button
                                onClick={openAccountModal}
                                type="button"
                                className="bg-red-500 text-black font-black px-4 py-2 border-2 border-red-500 hover:bg-white hover:text-black transition-colors uppercase text-sm"
                              >
                                {account.displayName}
                                {account.displayBalance
                                  ? ` (${account.displayBalance})`
                                  : ""}
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
        )}
      </div>
    </nav>
  );
};
