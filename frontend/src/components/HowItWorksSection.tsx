import React from "react";
import { useImageLoader } from "../hooks/useImageLoader";
import {
  DiagramSpinner,
  DiagramError,
  DiagramPlaceholder,
} from "./DiagramSpinner";

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      title: "Tokenize",
      description: "Tokenize your data into secure DataTokens.",
    },
    {
      title: "Configure",
      description: "Set your terms, price, and access rules.",
    },
    {
      title: "Share",
      description: "Share or sell data safely via Sei Network.",
    },
  ];

  const diagramLoader = useImageLoader({
    src: "/images/diagram.svg",
    threshold: 0.2, // Load when 20% visible
    rootMargin: "100px", // Start loading 100px before entering viewport
  });

  return (
    <>
      <section className="bg-black text-white py-20 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-black uppercase mb-16 text-center">
            How It Works
          </h2>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step number block */}
                <div className="bg-red-500 text-black w-20 h-20 flex items-center justify-center mb-8">
                  <span className="font-black text-3xl font-mono">
                    {index + 1}
                  </span>
                </div>

                {/* Content block */}
                <div className="border-2 border-white p-8">
                  <h3 className="text-3xl font-black uppercase mb-4">
                    {step.title}
                  </h3>
                  <p className="text-lg font-mono leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-white text-black py-20 px-6 md:px-12 lg:px-24">
        {/* Diagram Section */}
        <div className=" bg-white">
          <div className="text-center mb-8">
            <h3 className="text-3xl md:text-5xl font-black uppercase mb-4">
              Interactive Process Diagram
            </h3>
            <p className="text-lg font-mono text-gray-400 max-w-3xl mx-auto">
              Explore the complete Enclava workflow with our detailed animated
              diagram
            </p>
          </div>

          {/* Diagram Container */}
          <div
            ref={diagramLoader.imageRef}
            className="relative bg-white    overflow-hidden "
            style={{
              height: "min(80vh, 800px)", // Fit screen height but max 800px
              maxHeight: "80vh",
            }}
          >
            {/* Loading State */}
            {diagramLoader.isLoading && (
              <div className="h-full flex items-center justify-center bg-gray-50">
                <DiagramSpinner size="lg" />
              </div>
            )}

            {/* Error State */}
            {diagramLoader.isError && (
              <div className="h-full flex items-center justify-center bg-gray-50">
                <DiagramError
                  onRetry={diagramLoader.retryLoad}
                  className="p-8"
                />
              </div>
            )}

            {/* Placeholder (when not yet visible) */}
            {!diagramLoader.isVisible &&
              !diagramLoader.isLoading &&
              !diagramLoader.isError && (
                <div className="h-full flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300">
                  <div className="text-center space-y-4 p-8">
                    <div className="w-16 h-16 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-mono text-sm">
                      Scroll down to view the interactive diagram
                    </p>
                  </div>
                </div>
              )}

            {/* Loaded Diagram */}
            {!diagramLoader.isLoading &&
              !diagramLoader.isError &&
              diagramLoader.isVisible && (
                <div className="relative h-full w-full flex items-center justify-center bg-white">
                  <img
                    src="/images/diagram.svg"
                    alt="Enclava Process Diagram - Interactive workflow showing data tokenization, configuration, and sharing"
                    className="max-w-full max-h-full object-contain"
                    style={{
                      filter: "none",
                    }}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}
          </div>

          {/* Diagram Description */}
          <div className="mt-6 text-center">
            <p className="text-sm font-mono text-gray-500 max-w-4xl mx-auto leading-relaxed">
              This interactive diagram illustrates the complete Enclava
              ecosystem, showing how data flows through our platform process,
              smart contract interactions, and secure sharing mechanisms powered
              by the Sei Network.
            </p>
          </div>
        </div>
      </section>
    </>
  );
};
