import React from "react";

interface DiagramSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const DiagramSpinner: React.FC<DiagramSpinnerProps> = ({
  size = "md",
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center space-y-4 ${className}`}
    >
      {/* Spinner */}
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-red-500 rounded-full border-t-transparent animate-spin"></div>
      </div>

      {/* Loading text */}
      <div className="text-center">
        <p className="text-lg font-mono text-white mb-2">Loading Diagram...</p>
        <p className="text-sm text-gray-400 font-mono">
          This may take a moment
        </p>
      </div>

      {/* Progress indicator dots */}
      <div className="flex space-x-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <div
          className="w-2 h-2 bg-red-500 rounded-full animate-pulse"
          style={{ animationDelay: "0.2s" }}
        ></div>
        <div
          className="w-2 h-2 bg-red-500 rounded-full animate-pulse"
          style={{ animationDelay: "0.4s" }}
        ></div>
      </div>
    </div>
  );
};

interface DiagramErrorProps {
  onRetry: () => void;
  className?: string;
}

export const DiagramError: React.FC<DiagramErrorProps> = ({
  onRetry,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center space-y-6 text-center ${className}`}
    >
      {/* Error icon */}
      <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center">
        <svg
          className="w-12 h-12 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Error message */}
      <div className="space-y-2">
        <h3 className="text-xl font-black text-white uppercase">
          Failed to Load Diagram
        </h3>
        <p className="text-gray-400 font-mono max-w-md">
          There was an error loading the diagram. This might be due to network
          issues or the large file size.
        </p>
      </div>

      {/* Retry button */}
      <button
        onClick={onRetry}
        className="bg-red-500 hover:bg-red-600 text-black font-black uppercase px-8 py-3 transition-colors duration-200 border-2 border-red-500 hover:border-red-600"
      >
        Try Again
      </button>
    </div>
  );
};

interface DiagramPlaceholderProps {
  className?: string;
}

export const DiagramPlaceholder: React.FC<DiagramPlaceholderProps> = ({
  className = "",
}) => {
  return (
    <div
      className={`flex items-center justify-center bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-600 ${className}`}
    >
      <div className="text-center space-y-4 p-8">
        {/* Diagram icon */}
        <div className="w-16 h-16 mx-auto bg-gray-700 rounded-lg flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
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

        <p className="text-gray-400 font-mono text-sm">
          Scroll down to view the interactive diagram
        </p>
      </div>
    </div>
  );
};
