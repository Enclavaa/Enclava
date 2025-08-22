import React, { useState, useEffect } from "react";
import { User, Edit, Trash2, Plus, DollarSign, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { toast } from "react-toastify";
import { getUserProfile, MarketplaceDataset, ApiError } from "../services/api";
import { useUserEarnings } from "../hooks/useUserEarnings";

const ProfileDashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [userDatasets, setUserDatasets] = useState<MarketplaceDataset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);

  // Get total earnings from smart contract
  const {
    totalEarnings,
    isLoading: earningsLoading,
    error: earningsError,
  } = useUserEarnings(address);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!address || !isConnected) return;

      setIsLoading(true);
      try {
        const datasets = await getUserProfile(address);
        setUserDatasets(datasets);
      } catch (error) {
        if (error instanceof ApiError) {
          toast.error(`Error loading profile: ${error.message}`, {
            position: "top-right",
            autoClose: 5000,
          });
        } else {
          toast.error("Failed to load profile. Please try again.", {
            position: "top-right",
            autoClose: 5000,
          });
        }
        console.error("Error fetching user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [address, isConnected]);

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const handleDelete = (datasetId: number) => {
    if (confirm("Are you sure you want to delete this dataset?")) {
      // Handle deletion logic here
      console.log("Deleting dataset:", datasetId);
      toast.info("Delete functionality will be implemented soon.", {
        position: "top-right",
        autoClose: 3000,
      });
    }
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

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="border-4 border-black p-8 text-center bg-gray-50">
          <User className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="font-black text-xl uppercase mb-2">
            Wallet Not Connected
          </h3>
          <p className="font-mono text-gray-600 mb-4">
            Please connect your wallet to view your profile
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b-4 border-black bg-black text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center space-x-6">
            {/* Avatar Block */}
            <div className="border-4 border-white p-4 bg-red-500">
              <User className="text-black" size={32} />
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black uppercase mb-2">
                Profile Dashboard
              </h1>
              <div className="flex items-center space-x-4">
                <span className="font-mono text-lg">
                  [WALLET: {shortAddress}]
                </span>
                <span className="font-mono text-sm bg-green-500 text-black px-2 py-1 uppercase font-black">
                  CONNECTED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="border-4 border-black p-6 text-center bg-gray-50">
            <DollarSign className="mx-auto mb-3 text-red-500" size={32} />
            <div className="font-black text-3xl text-red-500 mb-1">
              {earningsLoading
                ? "..."
                : `${parseFloat(totalEarnings).toFixed(1)} SEI`}
            </div>
            <div className="font-mono text-sm uppercase font-black">
              Total Earnings
            </div>
            {earningsError && (
              <div className="text-xs text-red-600 mt-1">
                Error loading earnings
              </div>
            )}
          </div>

          <div className="border-4 border-black p-6 text-center bg-gray-50">
            <Database className="mx-auto mb-3 text-red-500" size={32} />
            <div className="font-black text-3xl text-red-500 mb-1">
              {isLoading ? "..." : userDatasets.length}
            </div>
            <div className="font-mono text-sm uppercase font-black">
              Datasets Listed
            </div>
          </div>
        </div>

        {/* My Datasets Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-black text-2xl uppercase">
              My Listed Datasets
            </h2>
            <Link
              to="/upload-dataset"
              className="flex items-center space-x-2 bg-red-500 text-white font-black px-6 py-3 border-4 border-red-500 hover:bg-black hover:border-black transition-colors uppercase"
            >
              <Plus size={20} />
              <span>Add Dataset</span>
            </Link>
          </div>

          {isLoading ? (
            <div className="border-4 border-black p-8 text-center bg-gray-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="font-mono text-gray-600">
                Loading your datasets...
              </p>
            </div>
          ) : userDatasets.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {userDatasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className="border-4 border-black bg-white"
                >
                  {/* Card Header */}
                  <div className="bg-black text-white p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-xs uppercase bg-red-500 text-black px-2 py-1">
                        {dataset.category}
                      </span>
                      <span
                        className={`font-mono text-xs px-2 py-1 font-black ${getStatusColor(
                          dataset.status
                        )}`}
                      >
                        {dataset.status.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-black text-lg uppercase leading-tight">
                      {dataset.name}
                    </h3>
                  </div>

                  {/* Card Body */}
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-4 font-mono">
                      {dataset.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="font-mono text-xs uppercase font-black text-gray-500">
                          Price
                        </div>
                        <div className="font-black text-lg text-red-500">
                          {dataset.price} SEI
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-xs uppercase font-black text-gray-500">
                          Size
                        </div>
                        <div className="font-mono text-lg">
                          {formatFileSize(dataset.dataset_size)}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-xs uppercase font-black text-gray-500">
                          NFT ID
                        </div>
                        <div className="font-mono text-lg">
                          {dataset.nft_id || "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-xs uppercase font-black text-gray-500">
                          Created
                        </div>
                        <div className="font-mono text-sm">
                          {new Date(dataset.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Link
                        to={`/dataset/${dataset.id}`}
                        className="flex-1 border-2 border-black bg-black text-white py-2 font-black uppercase text-center hover:bg-gray-800 transition-colors"
                      >
                        VIEW
                      </Link>
                      <button className="flex items-center justify-center border-2 border-blue-500 bg-blue-500 text-white p-2 hover:bg-blue-600 transition-colors">
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(dataset.id)}
                        className="flex items-center justify-center border-2 border-red-500 bg-red-500 text-white p-2 hover:bg-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-4 border-t-2 border-gray-200 pt-4">
                      <p className="font-mono text-xs font-black text-gray-600">
                        SECURE ENCLAVE PROCESSING - NO RAW DATA ACCESS
                      </p>
                      {dataset.nft_tx && (
                        <p className="font-mono text-xs text-gray-500 mt-1">
                          TX: {dataset.nft_tx.slice(0, 20)}...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-4 border-black p-8 text-center bg-gray-50">
              <Database className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="font-black text-xl uppercase mb-2">
                No Datasets Listed
              </h3>
              <p className="font-mono text-gray-600 mb-4">
                Start earning by uploading your first dataset
              </p>
              <Link
                to="/upload-dataset"
                className="inline-block bg-red-500 text-white font-black px-6 py-3 border-4 border-red-500 hover:bg-black hover:border-black transition-colors uppercase"
              >
                Upload Dataset
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileDashboard;
