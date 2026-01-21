import React, { useState, useEffect } from "react";
import {
  Shield,
  Calendar,
  User,
  HardDrive,
  Tag,
  ArrowRight,
} from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getDatasetDetails,
  MarketplaceDataset,
  ApiError,
} from "../services/api";

interface RelatedDataset {
  id: string;
  name: string;
  price: string;
  category: string;
}

// Mock related datasets - in a real app this would come from an API
const relatedDatasets: RelatedDataset[] = [
  {
    id: "2",
    name: "SOCIAL_SENTIMENT_CRYPTO",
    price: "1.2 Hedera",
    category: "Social Media",
  },
  {
    id: "5",
    name: "USER_INTERACTION_LOGS",
    price: "0.3 Hedera",
    category: "Analytics",
  },
  {
    id: "8",
    name: "GAMING_BEHAVIOR_2024",
    price: "0.9 Hedera",
    category: "Gaming",
  },
];

const DatasetDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [dataset, setDataset] = useState<MarketplaceDataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [isLaunchingEnclave, setIsLaunchingEnclave] = useState(false);

  // Fetch dataset details
  useEffect(() => {
    const fetchDataset = async () => {
      if (!id || isNaN(Number(id))) {
        setError("Invalid dataset ID");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const datasetData = await getDatasetDetails(Number(id));
        setDataset(datasetData);
      } catch (error) {
        if (error instanceof ApiError) {
          setError(error.message);
          toast.error(`Error loading dataset: ${error.message}`, {
            position: "top-right",
            autoClose: 5000,
          });
        } else {
          setError("Failed to load dataset details");
          toast.error("Failed to load dataset details. Please try again.", {
            position: "top-right",
            autoClose: 5000,
          });
        }
        console.error("Error fetching dataset details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataset();
  }, [id]);

  const handlePurchase = () => {
    setIsPurchasing(true);
    setTimeout(() => {
      setIsPurchasing(false);
      setIsPurchased(true);
      toast.success("Purchase functionality will be implemented soon.", {
        position: "top-right",
        autoClose: 3000,
      });
    }, 2000);
  };

  const handleLaunchEnclave = () => {
    setIsLaunchingEnclave(true);
    setTimeout(() => {
      setIsLaunchingEnclave(false);
      toast.info("Enclave launch functionality will be implemented soon.", {
        position: "top-right",
        autoClose: 3000,
      });
    }, 2000);
  };

  const formatFileSize = (sizeInBytes: number): string => {
    const mb = sizeInBytes / (1024 * 1024);
    if (mb < 1024) {
      return `${mb.toFixed(1)}MB`;
    }
    return `${(mb / 1024).toFixed(1)}GB`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-500 text-black";
      case "pending":
        return "bg-yellow-500 text-black";
      default:
        return "bg-blue-500 text-white";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="border-4 border-black p-8 text-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="font-mono text-gray-600">Loading dataset details...</p>
        </div>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="border-4 border-black p-8 text-center bg-gray-50">
          <h3 className="font-black text-xl uppercase mb-2">
            Dataset Not Found
          </h3>
          <p className="font-mono text-gray-600 mb-4">
            {error || "The requested dataset could not be found."}
          </p>
          <Link
            to="/marketplace"
            className="inline-block bg-red-500 text-white font-black px-6 py-3 border-4 border-red-500 hover:bg-black hover:border-black transition-colors uppercase"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b-4 border-black bg-black text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-black uppercase mb-2">
                {dataset.name}
              </h1>
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs uppercase bg-red-500 text-black px-3 py-1 font-black">
                  {dataset.category}
                </span>
                <span
                  className={`font-mono text-xs px-2 py-1 font-black ${getStatusColor(
                    dataset.status
                  )}`}
                >
                  {dataset.status.toUpperCase()}
                </span>
                <span className="font-mono text-lg">
                  [ID: {dataset.id}] [NFT: {dataset.nft_id || "N/A"}]
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-black text-4xl text-red-500 mb-1">
                {dataset.price} Hedera
              </div>
              <div className="font-mono text-sm uppercase">PRICE</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Description */}
            <div className="border-4 border-black p-6 mb-8">
              <h2 className="font-black text-2xl uppercase mb-4 border-b-2 border-black pb-2">
                Dataset Description
              </h2>
              <div className="space-y-4">
                <p className="font-mono leading-relaxed text-sm">
                  {dataset.description}
                </p>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="border-4 border-black p-6 mb-8">
              <h2 className="font-black text-2xl uppercase mb-4 border-b-2 border-black pb-2">
                Dataset Metadata
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-black p-4 bg-gray-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <HardDrive className="text-red-500" size={20} />
                    <span className="font-black uppercase">Size</span>
                  </div>
                  <div className="font-mono text-lg font-black">
                    {formatFileSize(dataset.dataset_size)}
                  </div>
                </div>

                <div className="border-2 border-black p-4 bg-gray-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="text-red-500" size={20} />
                    <span className="font-black uppercase">Owner</span>
                  </div>
                  <div className="font-mono text-lg font-black">
                    {`${dataset.owner_address.slice(
                      0,
                      6
                    )}...${dataset.owner_address.slice(-4)}`}
                  </div>
                </div>

                <div className="border-2 border-black p-4 bg-gray-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Tag className="text-red-500" size={20} />
                    <span className="font-black uppercase">Category</span>
                  </div>
                  <div className="font-mono text-lg font-black">
                    {dataset.category}
                  </div>
                </div>

                <div className="border-2 border-black p-4 bg-gray-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="text-red-500" size={20} />
                    <span className="font-black uppercase">Created</span>
                  </div>
                  <div className="font-mono text-lg font-black">
                    {new Date(dataset.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Additional metadata */}
              {dataset.nft_tx && (
                <div className="mt-4 border-2 border-black p-4 bg-gray-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="text-red-500" size={20} />
                    <span className="font-black uppercase">
                      NFT Transaction
                    </span>
                  </div>
                  <div className="font-mono text-sm break-all">
                    {dataset.nft_tx}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Purchase Card */}
            <div className="border-4 border-black p-6 mb-8 bg-gray-50">
              <div className="text-center mb-6">
                <div className="font-black text-3xl mb-2">
                  {dataset.price} Hedera
                </div>
                <div className="font-mono text-sm uppercase">TOTAL PRICE</div>
              </div>

              {isPurchased ? (
                <div className="space-y-4">
                  <div className="border-2 border-green-500 bg-green-50 p-4 text-center">
                    <Shield className="mx-auto mb-2 text-green-500" size={24} />
                    <div className="font-black uppercase text-green-700">
                      PURCHASED
                    </div>
                  </div>
                  <button
                    onClick={handleLaunchEnclave}
                    disabled={isLaunchingEnclave}
                    className={`w-full border-4 py-4 font-black uppercase text-lg transition-colors ${
                      isLaunchingEnclave
                        ? "border-gray-300 bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "border-green-500 bg-green-500 text-white hover:bg-green-600 hover:border-green-600"
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Shield size={20} />
                      <span>
                        {isLaunchingEnclave ? "LAUNCHING..." : "RUN IN ENCLAVE"}
                      </span>
                    </div>
                  </button>
                  <div className="border-2 border-black p-4 bg-gray-50">
                    <p className="font-mono text-sm font-black leading-relaxed">
                      YOUR DATA IS NEVER DOWNLOADED. IT IS SECURELY PROCESSED
                      INSIDE AN ENCLAVE. YOU GET RESULTS, NOT RAW FILES.
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={isPurchasing}
                  className={`w-full border-4 py-4 font-black uppercase text-lg transition-colors ${
                    isPurchasing
                      ? "border-gray-300 bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "border-red-500 bg-red-500 text-white hover:bg-black hover:border-black"
                  }`}
                >
                  {isPurchasing ? "PURCHASING..." : "BUY NOW"}
                </button>
              )}

              <div className="mt-4 font-mono text-xs text-center text-gray-500">
                SECURE BLOCKCHAIN TRANSACTION
              </div>
            </div>

            {/* Stats */}
            <div className="border-4 border-black p-6 mb-8">
              <h3 className="font-black text-lg uppercase mb-4 border-b-2 border-black pb-2">
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between font-mono text-sm">
                  <span className="font-black">NFT ID:</span>
                  <span>{dataset.nft_id || "N/A"}</span>
                </div>
                <div className="flex justify-between font-mono text-sm">
                  <span className="font-black">STATUS:</span>
                  <span>{dataset.status.toUpperCase()}</span>
                </div>
                <div className="flex justify-between font-mono text-sm">
                  <span className="font-black">UPDATED:</span>
                  <span>
                    {new Date(dataset.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between font-mono text-sm">
                  <span className="font-black">OWNER ID:</span>
                  <span>{dataset.owner_id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Datasets */}
        <div className="mt-12">
          <h2 className="font-black text-3xl uppercase mb-6 border-b-4 border-black pb-4">
            Related Datasets
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedDatasets.map((relatedDataset) => (
              <Link
                key={relatedDataset.id}
                to={`/dataset/${relatedDataset.id}`}
                className="border-4 border-black bg-white hover:bg-gray-50 transition-colors group"
              >
                <div className="bg-black text-white p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs uppercase bg-red-500 text-black px-2 py-1">
                      {relatedDataset.category}
                    </span>
                    <ArrowRight
                      className="text-white group-hover:text-red-500 transition-colors"
                      size={20}
                    />
                  </div>
                  <h3 className="font-black text-lg uppercase leading-tight">
                    {relatedDataset.name}
                  </h3>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xl text-red-500">
                      {relatedDataset.price}
                    </span>
                    <span className="font-mono text-sm uppercase font-black">
                      VIEW DETAILS
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatasetDetails;
