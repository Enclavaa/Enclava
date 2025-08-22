import React, { useState, useEffect } from "react";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  uploadDataset,
  generateDatasetDetails,
  UploadDatasetSuccessResponse,
  GenerateDatasetDetailsResponse,
  ApiError,
} from "../services/api";
import { DATASET_NFT_CONTRACT } from "../contracts/DatasetNFT";
import { seiTestnet } from "../wagmi.config";

interface FormData {
  name: string;
  description: string;
  category: string;
  dataset_price: number;
  file: File | null;
}

interface FormErrors {
  name?: string;
  description?: string;
  category?: string;
  dataset_price?: string;
  file?: string;
  wallet?: string;
}

// const categories = [
//   "Consumer Data",
//   "Social Media",
//   "Environmental",
//   "Financial",
//   "Analytics",
//   "Healthcare",
//   "IoT",
//   "Gaming",
//   "Web3",
// ];

const UploadDataset: React.FC = () => {
  const { address, isConnected } = useAccount();

  // Step management
  const [currentStep, setCurrentStep] = useState<"upload" | "review">("upload");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGeneratedDetails, setAiGeneratedDetails] =
    useState<GenerateDatasetDetailsResponse | null>(null);

  // NFT Minting states
  const [isMintingNFT, setIsMintingNFT] = useState(false);
  const [mintingComplete, setMintingComplete] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    category: "",
    dataset_price: 0,
    file: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadResponse, setUploadResponse] =
    useState<UploadDatasetSuccessResponse | null>(null);

  // Wagmi hooks for NFT minting
  const {
    writeContract,
    data: hash,
    error: writeError,
    isPending,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.file) {
      newErrors.file = "FILE UPLOAD IS REQUIRED";
    } else if (!formData.file.name.toLowerCase().endsWith(".csv")) {
      newErrors.file = "ONLY CSV FILES ARE SUPPORTED";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!isConnected || !address) {
      newErrors.wallet = "PLEASE CONNECT YOUR WALLET FIRST";
    }

    if (!formData.name.trim()) {
      newErrors.name = "DATASET NAME IS REQUIRED";
    }

    if (!formData.description.trim()) {
      newErrors.description = "DESCRIPTION IS REQUIRED";
    } else if (formData.description.length < 10) {
      newErrors.description = "DESCRIPTION MUST BE AT LEAST 10 CHARACTERS";
    }

    if (!formData.category) {
      newErrors.category = "CATEGORY IS REQUIRED";
    }

    if (formData.dataset_price <= 0) {
      newErrors.dataset_price = "PRICE MUST BE GREATER THAN 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "dataset_price" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setFormData((prev) => ({ ...prev, file: files[0] }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFormData((prev) => ({ ...prev, file: files[0] }));
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      return;
    }

    setIsGenerating(true);
    setErrors({});

    try {
      const response = await generateDatasetDetails(formData.file!);
      setAiGeneratedDetails(response);

      // Set the generated details in the form
      setFormData((prev) => ({
        ...prev,
        name: response.name,
        description: response.description,
        category: response.category,
      }));

      setCurrentStep("review");

      toast.success("AI generated dataset details successfully!", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(`Failed to generate dataset details: ${error.message}`, {
          position: "top-right",
          autoClose: 8000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        toast.error("An unexpected error occurred while generating details.", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await uploadDataset({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        dataset_price: formData.dataset_price,
        user_address: address!,
        file: formData.file!,
      });

      setUploadResponse(response);
      setIsSubmitted(true);

      toast.success(
        `Dataset "${response.filename}" uploaded successfully! Now minting your NFT...`,
        {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );

      // Start NFT minting process immediately after successful upload
      await mintDatasetNFT(response.dataset_id);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message, {
          position: "top-right",
          autoClose: 8000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        toast.error("An unexpected error occurred. Please try again.", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // NFT Minting function
  const mintDatasetNFT = async (datasetId: number) => {
    if (!address) {
      setMintError("Wallet not connected");
      return;
    }

    try {
      setIsMintingNFT(true);
      setMintError(null);

      // Call the smart contract safeMint function
      writeContract({
        ...DATASET_NFT_CONTRACT,
        functionName: "safeMint",
        args: [address, datasetId.toString()],
        chainId: seiTestnet.id,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to mint NFT";
      setMintError(errorMessage);
      setIsMintingNFT(false);

      toast.error(`NFT Minting failed: ${errorMessage}`, {
        position: "top-right",
        autoClose: 8000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  // Effect to handle transaction status changes
  useEffect(() => {
    if (writeError) {
      const errorMessage = writeError.message || "Failed to mint NFT";
      setMintError(errorMessage);
      setIsMintingNFT(false);

      toast.error(`NFT Minting failed: ${errorMessage}`, {
        position: "top-right",
        autoClose: 8000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [writeError]);

  useEffect(() => {
    if (isConfirmed && hash) {
      setMintingComplete(true);
      setIsMintingNFT(false);

      toast.success(
        ` NFT Minted Successfully! Transaction: ${hash.slice(0, 10)}...`,
        {
          position: "top-right",
          autoClose: 8000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );
    }
  }, [isConfirmed, hash]);

  const handleBackToStep1 = () => {
    setCurrentStep("upload");
    setAiGeneratedDetails(null);
    setErrors({});
  };

  const removeFile = () => {
    setFormData((prev) => ({ ...prev, file: null }));
  };

  if (isSubmitted && uploadResponse) {
    return (
      <div className="min-h-screen bg-white text-black">
        <div className="border-b-4 border-black bg-black text-white p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-black uppercase mb-4">
              Dataset Uploaded
            </h1>
            <p className="font-mono text-lg">
              [STATUS: SUCCESS] [FILE_ID: {uploadResponse.file_id}] [DATASET_ID:{" "}
              {uploadResponse.dataset_id}]
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          <div className="border-4 border-green-500 bg-green-50 p-8">
            <div className="text-center mb-6">
              <h2 className="font-black text-2xl uppercase mb-4">
                DATASET SUCCESSFULLY UPLOADED
              </h2>
              <p className="font-mono mb-6">{uploadResponse.message}</p>
            </div>

            {/* NFT Minting Status */}
            <div className="border-4 border-blue-500 bg-blue-50 p-6 mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <h3 className="font-black text-xl uppercase text-blue-800">
                    Dataset NFT Status
                  </h3>
                </div>

                {isMintingNFT || isPending ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="font-mono text-blue-700">
                        {isPending
                          ? "Confirming transaction..."
                          : "Minting your NFT..."}
                      </span>
                    </div>
                    <p className="font-mono text-sm text-blue-600">
                      Please confirm the transaction in your wallet
                    </p>
                  </div>
                ) : isConfirming ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="font-mono text-blue-700">
                        Transaction confirming on blockchain...
                      </span>
                    </div>
                    {hash && (
                      <p className="font-mono text-sm text-blue-600">
                        Tx: {hash.slice(0, 10)}...{hash.slice(-8)}
                      </p>
                    )}
                  </div>
                ) : mintingComplete ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="font-black text-green-700 uppercase">
                        NFT Minted Successfully!
                      </span>
                    </div>
                    {hash && (
                      <p className="font-mono text-sm text-green-600">
                        Transaction: {hash.slice(0, 10)}...{hash.slice(-8)}
                      </p>
                    )}
                  </div>
                ) : mintError ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <AlertCircle className="text-red-600" size={24} />
                      <span className="font-black text-red-700 uppercase">
                        NFT Minting Failed
                      </span>
                    </div>
                    <p className="font-mono text-sm text-red-600">
                      {mintError}
                    </p>
                    <button
                      onClick={() => mintDatasetNFT(uploadResponse.dataset_id)}
                      className="bg-blue-500 text-white font-black px-4 py-2 border-2 border-blue-500 hover:bg-blue-600 hover:border-blue-600 transition-colors uppercase text-sm"
                    >
                      Retry NFT Minting
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="font-mono text-gray-700">
                      NFT minting will begin automatically...
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border-2 border-black bg-white p-4">
                <h3 className="font-black uppercase mb-2">File Details</h3>
                <div className="font-mono text-sm space-y-1">
                  <p>
                    <strong>Filename:</strong> {uploadResponse.filename}
                  </p>
                  <p>
                    <strong>File ID:</strong> {uploadResponse.file_id}
                  </p>
                  <p>
                    <strong>Dataset ID:</strong> {uploadResponse.dataset_id}
                  </p>
                  <p>
                    <strong>File Size:</strong>{" "}
                    {(uploadResponse.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p>
                    <strong>Row Count:</strong>{" "}
                    {uploadResponse.row_count.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="border-2 border-black bg-white p-4">
                <h3 className="font-black uppercase mb-2">Dataset Info</h3>
                <div className="font-mono text-sm space-y-1">
                  <p>
                    <strong>Name:</strong> {formData.name}
                  </p>
                  <p>
                    <strong>Category:</strong> {formData.category}
                  </p>
                  <p>
                    <strong>Price:</strong> {formData.dataset_price} SEI
                  </p>
                  <p>
                    <strong>Status:</strong> UPLOADED
                  </p>
                  <p>
                    <strong>NFT Status:</strong>{" "}
                    <span
                      className={
                        mintingComplete
                          ? "text-green-600 font-black"
                          : isMintingNFT || isPending || isConfirming
                          ? "text-blue-600 font-black"
                          : mintError
                          ? "text-red-600 font-black"
                          : "text-gray-600"
                      }
                    >
                      {mintingComplete
                        ? "MINTED"
                        : isMintingNFT || isPending || isConfirming
                        ? "MINTING..."
                        : mintError
                        ? "FAILED"
                        : "PENDING"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setUploadResponse(null);
                  setCurrentStep("upload");
                  setAiGeneratedDetails(null);
                  setFormData({
                    name: "",
                    description: "",
                    category: "",
                    dataset_price: 0,
                    file: null,
                  });
                  setErrors({});
                  setIsMintingNFT(false);
                  setMintingComplete(false);
                  setMintError(null);
                }}
                className="bg-black text-white font-black px-8 py-4 border-4 border-black hover:bg-green-500 hover:border-green-500 transition-colors uppercase"
              >
                UPLOAD ANOTHER DATASET
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b-4 border-black bg-black text-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-black uppercase mb-4">
            {currentStep === "upload"
              ? "Upload Your Dataset"
              : "Review & List Dataset"}
          </h1>
          <p className="font-mono text-lg">
            [STEP:{" "}
            {currentStep === "upload" ? "1/2 - AI ANALYSIS" : "2/2 - FINALIZE"}]
            [STATUS:{" "}
            {isGenerating
              ? "ANALYZING..."
              : isSubmitting
              ? "UPLOADING..."
              : "READY"}
            ]
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Step Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div
            className={`flex items-center space-x-4 p-4 border-4 ${
              currentStep === "upload"
                ? "border-red-500 bg-red-50"
                : "border-green-500 bg-green-50"
            }`}
          >
            <div
              className={`w-8 h-8 border-2 border-black flex items-center justify-center font-black ${
                currentStep === "upload"
                  ? "bg-red-500 text-white"
                  : "bg-green-500 text-white"
              }`}
            >
              1
            </div>
            <span className="font-black uppercase text-sm">
              {currentStep === "upload"
                ? "UPLOAD & AI ANALYSIS"
                : "AI ANALYSIS COMPLETE"}
            </span>
            <div className="w-8 h-1 border-2 border-black bg-gray-300"></div>
            <div
              className={`w-8 h-8 border-2 border-black flex items-center justify-center font-black ${
                currentStep === "review"
                  ? "bg-red-500 text-white"
                  : "bg-gray-300"
              }`}
            >
              2
            </div>
            <span className="font-black uppercase text-sm">
              {currentStep === "review"
                ? "REVIEW & FINALIZE"
                : "REVIEW & FINALIZE"}
            </span>
          </div>
        </div>

        <form
          onSubmit={
            currentStep === "upload" ? handleStep1Submit : handleStep2Submit
          }
          className="space-y-6"
        >
          {currentStep === "upload" ? (
            // Step 1: File Upload Only
            <>
              {/* File Upload */}
              <div>
                <label className="block font-black text-lg uppercase mb-2">
                  Upload Dataset File *
                </label>
                <div
                  className={`border-4 border-dashed transition-all ${
                    isDragging
                      ? "border-red-500 bg-red-50"
                      : errors.file
                      ? "border-red-500 bg-red-50"
                      : "border-black bg-gray-50 hover:border-red-500 hover:bg-red-50"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => setIsDragging(true)}
                  onDragLeave={() => setIsDragging(false)}
                >
                  {formData.file ? (
                    <div className="p-8 text-center">
                      <div className="flex items-center justify-between border-2 border-black p-4 bg-white">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="text-green-500" size={24} />
                          <span className="font-mono font-black">
                            {formData.file.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={removeFile}
                          className="border-2 border-red-500 bg-red-500 text-white p-1 hover:bg-red-600 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <Upload
                        className="mx-auto mb-4 text-gray-500"
                        size={48}
                      />
                      <p className="font-black text-xl uppercase mb-2">
                        DROP FILE HERE OR CLICK TO UPLOAD
                      </p>
                      <p className="font-mono text-sm text-gray-500">
                        SUPPORTED: CSV FILES ONLY
                      </p>
                      <input
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                        accept=".csv"
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-block mt-4 bg-black text-white font-black px-6 py-3 border-2 border-black hover:bg-gray-800 transition-colors uppercase cursor-pointer"
                      >
                        SELECT FILE
                      </label>
                    </div>
                  )}
                </div>
                {errors.file && (
                  <div className="mt-2 border-2 border-red-500 bg-red-50 p-2">
                    <div className="flex items-center space-x-2 text-red-500">
                      <AlertCircle size={16} />
                      <span className="font-black text-sm">{errors.file}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Analysis Info */}
              <div className="border-4 border-black bg-gray-50 p-6">
                <h3 className="font-black text-xl uppercase mb-2">
                  🤖 AI-POWERED DATASET ANALYSIS
                </h3>
                <p className="font-mono text-sm text-gray-700">
                  Our AI will automatically analyze your CSV file and generate:
                </p>
                <ul className="font-mono text-sm text-gray-700 mt-2 space-y-1">
                  <li>• Dataset name based on content</li>
                  <li>• Detailed description of your data</li>
                  <li>• Appropriate category classification</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className={`w-full border-4 py-6 font-black uppercase text-xl transition-colors ${
                  isGenerating
                    ? "border-gray-300 bg-gray-300 text-gray-700 cursor-not-allowed"
                    : "border-red-500 bg-red-500 text-white hover:bg-black hover:border-black"
                }`}
              >
                {isGenerating ? "ANALYZING DATASET..." : "ANALYZE WITH AI"}
              </button>
            </>
          ) : (
            // Step 2: Review AI Generated Details + Set Price
            <>
              {/* AI Generated Message */}
              {aiGeneratedDetails && (
                <div className="border-4 border-green-500 bg-green-50 p-6 mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="text-green-500" size={24} />
                    <h3 className="font-black text-xl uppercase text-green-800">
                      AI ANALYSIS COMPLETE!
                    </h3>
                  </div>
                  <p className="font-mono text-sm text-green-700">
                    {aiGeneratedDetails.message}
                  </p>
                  <p className="font-mono text-sm text-green-700 mt-2">
                    Review the AI-generated details below and set your price.
                  </p>
                </div>
              )}

              {/* Dataset Name */}
              <div>
                <label className="block font-black text-lg uppercase mb-2">
                  Dataset Name *{" "}
                  {aiGeneratedDetails && (
                    <span className="text-green-600 text-sm">
                      (AI Generated)
                    </span>
                  )}
                </label>
                <div className="w-full border-4 border-green-500 bg-green-50 p-4 font-mono text-lg uppercase">
                  {formData.name}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-black text-lg uppercase mb-2">
                  Description *{" "}
                  {aiGeneratedDetails && (
                    <span className="text-green-600 text-sm">
                      (AI Generated)
                    </span>
                  )}
                </label>
                <div className="w-full border-4 border-green-500 bg-green-50 p-4 font-mono text-lg min-h-[120px]">
                  {formData.description}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block font-black text-lg uppercase mb-2">
                  Category *{" "}
                  {aiGeneratedDetails && (
                    <span className="text-green-600 text-sm">
                      (AI Generated)
                    </span>
                  )}
                </label>
                <div className="w-full border-4 border-green-500 bg-green-50 p-4 font-mono text-lg uppercase">
                  {formData.category}
                </div>
              </div>

              {/* File Display */}
              <div>
                <label className="block font-black text-lg uppercase mb-2">
                  Selected Dataset File
                </label>
                {formData.file && (
                  <div className="border-4 border-green-500 bg-green-50 p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="text-green-500" size={24} />
                      <span className="font-mono font-black">
                        {formData.file.name}
                      </span>
                      <span className="font-mono text-sm text-gray-600">
                        ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Wallet Connection Status */}
              <div>
                <label className="block font-black text-lg uppercase mb-2">
                  Wallet Connection *
                </label>
                <div
                  className={`w-full border-4 bg-white p-4 font-mono text-lg transition-colors ${
                    !isConnected || !address
                      ? "border-red-500"
                      : "border-green-500"
                  }`}
                >
                  {isConnected && address ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="text-green-500" size={20} />
                      <span className="text-green-600 font-black uppercase">
                        WALLET CONNECTED: {address.slice(0, 6)}...
                        {address.slice(-4)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="text-red-500" size={20} />
                      <span className="text-red-500 font-black uppercase">
                        WALLET NOT CONNECTED - PLEASE CONNECT YOUR WALLET
                      </span>
                    </div>
                  )}
                </div>
                {errors.wallet && (
                  <div className="mt-2 border-2 border-red-500 bg-red-50 p-2">
                    <div className="flex items-center space-x-2 text-red-500">
                      <AlertCircle size={16} />
                      <span className="font-black text-sm">
                        {errors.wallet}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="block font-black text-lg uppercase mb-2">
                  Price (in SEI Tokens) *
                </label>
                <div className="flex">
                  <input
                    type="number"
                    name="dataset_price"
                    value={formData.dataset_price || ""}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    className={`flex-1 border-4 border-r-0 bg-white p-4 font-mono text-lg placeholder-gray-500 outline-none transition-colors ${
                      errors.dataset_price
                        ? "border-red-500"
                        : "border-black focus:border-red-500"
                    }`}
                  />
                  <div className="border-4 border-black bg-black text-white p-4 font-mono text-lg font-black uppercase">
                    SEI
                  </div>
                </div>
                {errors.dataset_price && (
                  <div className="mt-2 border-2 border-red-500 bg-red-50 p-2">
                    <div className="flex items-center space-x-2 text-red-500">
                      <AlertCircle size={16} />
                      <span className="font-black text-sm">
                        {errors.dataset_price}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleBackToStep1}
                  className="flex-1 border-4 border-gray-500 bg-gray-500 text-white py-4 font-black uppercase text-lg hover:bg-gray-600 hover:border-gray-600 transition-colors"
                >
                  ← BACK TO FILE UPLOAD
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 border-4 py-4 font-black uppercase text-lg transition-colors ${
                    isSubmitting
                      ? "border-gray-300 bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "border-red-500 bg-red-500 text-white hover:bg-black hover:border-black"
                  }`}
                >
                  {isSubmitting ? "📤 UPLOADING..." : "🚀 LIST DATASET"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default UploadDataset;
