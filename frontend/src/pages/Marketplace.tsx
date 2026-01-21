import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getMarketplaceDatasets,
  MarketplaceDataset,
  ApiError,
} from "../services/api";

const categories = [
  "All Categories",
  "Consumer Data",
  "Social Media",
  "Environmental",
  "Financial",
  "Analytics",
  "Healthcare",
  "IoT",
  "Gaming",
  "Web3",
];

export const Marketplace: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(
    new Set()
  );

  // API state management
  const [datasets, setDatasets] = useState<MarketplaceDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch datasets from API
  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (debouncedSearchTerm) {
        params.search = debouncedSearchTerm;
      }
      if (selectedCategory !== "All Categories") {
        params.category = selectedCategory;
      }

      const data = await getMarketplaceDatasets(params);
      setDatasets(data);
    } catch (err) {
      const errorMessage =
        err instanceof ApiError ? err.message : "Failed to load datasets";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, selectedCategory]);

  // Fetch datasets on component mount and when debounced search or category changes
  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  // Helper functions
  const formatFileSize = (bytes: number): string => {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatCategory = (category: string): string => {
    // Convert "ConsumerData" to "Consumer Data"
    return category.replace(/([A-Z])/g, " $1").trim();
  };

  const toggleDescription = (datasetId: number) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(datasetId)) {
        newSet.delete(datasetId);
      } else {
        newSet.add(datasetId);
      }
      return newSet;
    });
  };

  const truncateDescription = (
    description: string,
    maxLength: number = 120
  ): string => {
    if (description.length <= maxLength) return description;
    return description.slice(0, maxLength) + "...";
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b-4 border-black bg-black text-white p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-black uppercase mb-4">
            Data Marketplace
          </h1>
          <p className="font-mono text-lg">
            [ACTIVE_DATASETS: {datasets.length}] [STATUS:{" "}
            {loading ? "LOADING..." : error ? "ERROR" : "LIVE"}]
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Search and Filters */}
        <div className="mb-8">
          {/* Search Bar */}
          <div className="relative mb-4">
            <div className="border-4 border-black flex items-center">
              <Search className="ml-4 text-black" size={24} />
              <input
                type="text"
                placeholder="SEARCH DATASETS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-4 font-mono font-black uppercase text-lg bg-white border-none outline-none placeholder-gray-500"
              />
              {loading && debouncedSearchTerm !== searchTerm && (
                <div className="mr-4">
                  <Loader2 className="animate-spin text-black" size={20} />
                </div>
              )}
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 bg-black text-white font-black px-6 py-3 border-4 border-black hover:bg-violet-500 hover:border-violet-500 transition-colors uppercase mb-4"
          >
            <Filter size={20} />
            <span>Filters</span>
          </button>

          {/* Category Filters */}
          {showFilters && (
            <div className="border-4 border-black p-4 bg-gray-100">
              <h3 className="font-black uppercase mb-4">Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`p-2 border-2 font-mono font-black text-sm uppercase transition-colors ${
                      selectedCategory === category
                        ? "border-violet-500 bg-violet-500 text-white"
                        : "border-black bg-white hover:bg-black hover:text-white"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="border-4 border-black p-8 bg-gray-100">
              <Loader2
                className="animate-spin mx-auto mb-4 text-black"
                size={48}
              />
              <h3 className="font-black text-2xl uppercase mb-4">
                Loading Datasets...
              </h3>
              <p className="font-mono">
                Fetching the latest data from the blockchain
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <div className="border-4 border-violet-500 p-8 bg-violet-50">
              <AlertCircle className="mx-auto mb-4 text-violet-500" size={48} />
              <h3 className="font-black text-2xl uppercase mb-4 text-violet-800">
                Error Loading Datasets
              </h3>
              <p className="font-mono text-violet-600 mb-4">{error}</p>
              <button
                onClick={fetchDatasets}
                className="bg-violet-500 text-white font-black px-6 py-3 border-2 border-violet-500 hover:bg-violet-600 hover:border-violet-600 transition-colors uppercase"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Dataset Cards Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {datasets.map((dataset) => {
              const isExpanded = expandedDescriptions.has(dataset.id);
              const shouldTruncate = dataset.description.length > 120;

              return (
                <div
                  key={dataset.id}
                  className="border-4 border-black bg-white flex flex-col h-full"
                >
                  {/* Card Header */}
                  <div className="bg-black text-white p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-xs uppercase bg-violet-500 text-black px-2 py-1">
                        {formatCategory(dataset.category)}
                      </span>
                      <span className="font-black text-lg text-violet-500">
                        {dataset.price} HBAR
                      </span>
                    </div>
                    <h3 className="font-black text-lg uppercase leading-tight">
                      {dataset.name}
                    </h3>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col">
                    {/* Description with consistent height */}
                    <div className="mb-4">
                      <p className="font-mono text-sm leading-relaxed">
                        {isExpanded
                          ? dataset.description
                          : truncateDescription(dataset.description)}
                      </p>
                      {shouldTruncate && (
                        <button
                          onClick={() => toggleDescription(dataset.id)}
                          className="mt-2 font-mono text-xs text-violet-500 hover:text-violet-700 transition-colors flex items-center space-x-1"
                        >
                          <span>{isExpanded ? "SHOW LESS" : "READ MORE"}</span>
                          {isExpanded ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Dataset Details */}
                    <div className="space-y-2 mb-4 flex-1">
                      <div className="flex justify-between font-mono text-sm">
                        <span className="font-black">SIZE:</span>
                        <span>{formatFileSize(dataset.dataset_size)}</span>
                      </div>
                      <div className="flex justify-between font-mono text-sm">
                        <span className="font-black">OWNER:</span>
                        <span>{formatAddress(dataset.owner_address)}</span>
                      </div>
                      <div className="flex justify-between font-mono text-sm">
                        <span className="font-black">NFT:</span>
                        <span
                          className={
                            dataset.nft_id ? "text-green-600" : "text-gray-500"
                          }
                        >
                          {dataset.nft_id ? `#${dataset.nft_id}` : "NONE"}
                        </span>
                      </div>
                      <div className="flex justify-between font-mono text-sm">
                        <span className="font-black">STATUS:</span>
                        <span
                          className={`${
                            dataset.status === "active"
                              ? "text-green-600"
                              : "text-gray-500"
                          } uppercase`}
                        >
                          {dataset.status}
                        </span>
                      </div>
                    </div>

                    {/* View Button - Always at bottom */}
                    <button
                      onClick={() =>
                        (window.location.href = `/dataset/${dataset.id}`)
                      }
                      className="w-full border-4 py-3 font-black uppercase text-lg transition-colors border-violet-500 bg-violet-500 text-white hover:bg-black hover:border-black mt-auto"
                    >
                      VIEW
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && datasets.length === 0 && (
          <div className="text-center py-16">
            <div className="border-4 border-black p-8 bg-gray-100">
              <h3 className="font-black text-2xl uppercase mb-4">
                No Datasets Found
              </h3>
              <p className="font-mono">Try adjusting your search or filters</p>
            </div>
          </div>
        )}

        {/* Stats Footer */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="border-2 border-black p-4 text-center">
              <div className="font-mono text-2xl font-black text-violet-500">
                {datasets.length}
              </div>
              <div className="font-black uppercase text-sm">Total Datasets</div>
            </div>
            <div className="border-2 border-black p-4 text-center">
              <div className="font-mono text-2xl font-black text-violet-500">
                {datasets.filter((d) => d.status === "active").length}
              </div>
              <div className="font-black uppercase text-sm">
                Active Datasets
              </div>
            </div>
            <div className="border-2 border-black p-4 text-center">
              <div className="font-mono text-2xl font-black text-violet-500">
                {formatFileSize(
                  datasets.reduce(
                    (total, dataset) => total + dataset.dataset_size,
                    0
                  )
                )}
              </div>
              <div className="font-black uppercase text-sm">
                Total Data Size
              </div>
            </div>
            <div className="border-2 border-black p-4 text-center">
              <div className="font-mono text-2xl font-black text-violet-500">
                {datasets
                  .reduce((total, dataset) => total + dataset.price, 0)
                  .toFixed(1)}{" "}
                HBAR
              </div>
              <div className="font-black uppercase text-sm">Total Value</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
