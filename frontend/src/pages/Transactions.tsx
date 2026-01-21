import React, { useState } from "react";
import {
  Filter,
  Search,
  ArrowUpDown,
  ExternalLink,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Transaction {
  id: string;
  datasetName: string;
  datasetId: string;
  buyer: string;
  seller: string;
  price: string;
  date: string;
  type: "purchase" | "sale";
  status: "completed" | "pending" | "failed";
}

const mockTransactions: Transaction[] = [
  {
    id: "TXN-001",
    datasetName: "CONSUMER_BEHAVIOR_Q4_2024",
    datasetId: "1",
    buyer: "0x9a1b...4c2d",
    seller: "0x742d...8f3a",
    price: "0.5 HBAR",
    date: "2024-12-20T14:30:00",
    type: "sale",
    status: "completed",
  },
  {
    id: "TXN-002",
    datasetName: "FINANCIAL_INDICATORS",
    datasetId: "4",
    buyer: "0x742d...8f3a",
    seller: "0x8d4a...1e6f",
    price: "2.0 HBAR",
    date: "2024-12-18T10:15:00",
    type: "purchase",
    status: "completed",
  },
  {
    id: "TXN-003",
    datasetName: "SOCIAL_SENTIMENT_ANALYSIS",
    datasetId: "2",
    buyer: "0x3f7e...9b8c",
    seller: "0x742d...8f3a",
    price: "1.2 HBAR",
    date: "2024-12-15T16:45:00",
    type: "sale",
    status: "completed",
  },
  {
    id: "TXN-004",
    datasetName: "IOT_SENSOR_DATA",
    datasetId: "5",
    buyer: "0x742d...8f3a",
    seller: "0x6b3e...4f7a",
    price: "1.8 HBAR",
    date: "2024-12-12T09:22:00",
    type: "purchase",
    status: "completed",
  },
  {
    id: "TXN-005",
    datasetName: "WEATHER_DATA_COLLECTION",
    datasetId: "3",
    buyer: "0x5c9b...7a2e",
    seller: "0x742d...8f3a",
    price: "0.8 HBAR",
    date: "2024-12-10T13:18:00",
    type: "sale",
    status: "pending",
  },
];

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState(mockTransactions);
  const [filterType, setFilterType] = useState<"all" | "buyer" | "seller">(
    "all"
  );
  const [priceRange, setPriceRange] = useState<
    "all" | "low" | "medium" | "high"
  >("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "week" | "month" | "quarter"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "price" | "dataset">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const userWallet = "0x742d...8f3a"; // Current user's wallet

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.datasetName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === "all" ||
      (filterType === "buyer" && transaction.buyer === userWallet) ||
      (filterType === "seller" && transaction.seller === userWallet);

    const priceValue = parseFloat(transaction.price.replace(" HBAR", ""));
    const matchesPrice =
      priceRange === "all" ||
      (priceRange === "low" && priceValue <= 0.5) ||
      (priceRange === "medium" && priceValue > 0.5 && priceValue <= 1.5) ||
      (priceRange === "high" && priceValue > 1.5);

    const transactionDate = new Date(transaction.date);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "week" && transactionDate >= weekAgo) ||
      (dateFilter === "month" && transactionDate >= monthAgo) ||
      (dateFilter === "quarter" && transactionDate >= quarterAgo);

    return matchesSearch && matchesType && matchesPrice && matchesDate;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "date":
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case "price":
        comparison =
          parseFloat(a.price.replace(" HBAR", "")) -
          parseFloat(b.price.replace(" HBAR", ""));
        break;
      case "dataset":
        comparison = a.datasetName.localeCompare(b.datasetName);
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: "date" | "price" | "dataset") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Calculate stats
  const totalVolume = mockTransactions.reduce((total, transaction) => {
    return total + parseFloat(transaction.price.replace(" HBAR", ""));
  }, 0);

  const salesCount = mockTransactions.filter(
    (t) => t.seller === userWallet && t.status === "completed"
  ).length;
  const purchasesCount = mockTransactions.filter(
    (t) => t.buyer === userWallet && t.status === "completed"
  ).length;

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b-4 border-black bg-black text-white p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-black uppercase mb-4">
            Transaction History
          </h1>
          <p className="font-mono text-lg">
            [TOTAL_TRANSACTIONS: {mockTransactions.length}] [VOLUME:{" "}
            {totalVolume.toFixed(1)} HBAR]
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="border-4 border-black p-6 text-center bg-gray-50">
            <DollarSign className="mx-auto mb-3 text-violet-500" size={32} />
            <div className="font-black text-2xl text-violet-500 mb-1">
              {totalVolume.toFixed(1)} HBAR
            </div>
            <div className="font-mono text-sm uppercase font-black">
              Total Volume
            </div>
          </div>

          <div className="border-4 border-black p-6 text-center bg-gray-50">
            <div className="font-black text-2xl text-violet-500 mb-1">
              {mockTransactions.length}
            </div>
            <div className="font-mono text-sm uppercase font-black">
              Total Transactions
            </div>
          </div>

          <div className="border-4 border-black p-6 text-center bg-gray-50">
            <div className="font-black text-2xl text-green-500 mb-1">
              {salesCount}
            </div>
            <div className="font-mono text-sm uppercase font-black">
              Sales Made
            </div>
          </div>

          <div className="border-4 border-black p-6 text-center bg-gray-50">
            <div className="font-black text-2xl text-blue-500 mb-1">
              {purchasesCount}
            </div>
            <div className="font-mono text-sm uppercase font-black">
              Purchases Made
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative">
            <div className="border-4 border-black flex items-center">
              <Search className="ml-4 text-black" size={24} />
              <input
                type="text"
                placeholder="SEARCH TRANSACTIONS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-4 font-mono font-black uppercase text-lg bg-white border-none outline-none placeholder-gray-500"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 bg-black text-white font-black px-6 py-3 border-4 border-black hover:bg-violet-500 hover:border-violet-500 transition-colors uppercase"
          >
            <Filter size={20} />
            <span>Filters</span>
          </button>

          {/* Filters */}
          {showFilters && (
            <div className="border-4 border-black p-6 bg-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Type Filter */}
                <div>
                  <label className="block font-black uppercase mb-2">
                    Transaction Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full border-2 border-black p-3 font-mono font-black uppercase"
                  >
                    <option value="all">ALL</option>
                    <option value="buyer">MY PURCHASES</option>
                    <option value="seller">MY SALES</option>
                  </select>
                </div>

                {/* Price Filter */}
                <div>
                  <label className="block font-black uppercase mb-2">
                    Price Range
                  </label>
                  <select
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value as any)}
                    className="w-full border-2 border-black p-3 font-mono font-black uppercase"
                  >
                    <option value="all">ALL PRICES</option>
                    <option value="low">≤ 0.5 HBAR</option>
                    <option value="medium">0.5 - 1.5 HBAR</option>
                    <option value="high">&gt; 1.5 HBAR</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block font-black uppercase mb-2">
                    Date Range
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="w-full border-2 border-black p-3 font-mono font-black uppercase"
                  >
                    <option value="all">ALL TIME</option>
                    <option value="week">LAST WEEK</option>
                    <option value="month">LAST MONTH</option>
                    <option value="quarter">LAST QUARTER</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Table */}
        {sortedTransactions.length > 0 ? (
          <div className="border-4 border-black overflow-x-auto">
            {/* Table Header */}
            <div className="bg-black text-white p-4">
              <div className="grid grid-cols-6 gap-4 font-black uppercase text-sm">
                <button
                  onClick={() => handleSort("dataset")}
                  className="flex items-center space-x-1 hover:text-violet-500 transition-colors text-left"
                >
                  <span>Transaction ID</span>
                  <ArrowUpDown size={14} />
                </button>
                <button
                  onClick={() => handleSort("dataset")}
                  className="flex items-center space-x-1 hover:text-violet-500 transition-colors text-left"
                >
                  <span>Dataset</span>
                  <ArrowUpDown size={14} />
                </button>
                <span>Buyer</span>
                <span>Seller</span>
                <button
                  onClick={() => handleSort("price")}
                  className="flex items-center space-x-1 hover:text-violet-500 transition-colors text-left"
                >
                  <span>Price</span>
                  <ArrowUpDown size={14} />
                </button>
                <button
                  onClick={() => handleSort("date")}
                  className="flex items-center space-x-1 hover:text-violet-500 transition-colors text-left"
                >
                  <span>Date</span>
                  <ArrowUpDown size={14} />
                </button>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y-2 divide-black">
              {sortedTransactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <div className="grid grid-cols-6 gap-4 items-center">
                    {/* Transaction ID */}
                    <div>
                      <div className="font-mono font-black text-sm">
                        {transaction.id}
                      </div>
                      <div
                        className={`inline-block px-2 py-1 text-xs font-black ${
                          transaction.type === "purchase"
                            ? "bg-blue-500 text-white"
                            : "bg-green-500 text-black"
                        }`}
                      >
                        {transaction.type.toUpperCase()}
                      </div>
                    </div>

                    {/* Dataset */}
                    <div>
                      <Link
                        to={`/dataset/${transaction.datasetId}`}
                        className="font-mono font-black text-sm hover:text-violet-500 transition-colors flex items-center space-x-1"
                      >
                        <span className="truncate">
                          {transaction.datasetName}
                        </span>
                        <ExternalLink size={12} />
                      </Link>
                      <div
                        className={`inline-block px-2 py-1 text-xs font-black mt-1 ${
                          transaction.status === "completed"
                            ? "bg-green-500 text-black"
                            : transaction.status === "pending"
                            ? "bg-yellow-500 text-black"
                            : "bg-violet-500 text-white"
                        }`}
                      >
                        {transaction.status.toUpperCase()}
                      </div>
                    </div>

                    {/* Buyer */}
                    <div>
                      <span
                        className={`font-mono text-sm ${
                          transaction.buyer === userWallet
                            ? "font-black text-blue-500"
                            : ""
                        }`}
                      >
                        {transaction.buyer}
                      </span>
                    </div>

                    {/* Seller */}
                    <div>
                      <span
                        className={`font-mono text-sm ${
                          transaction.seller === userWallet
                            ? "font-black text-green-500"
                            : ""
                        }`}
                      >
                        {transaction.seller}
                      </span>
                    </div>

                    {/* Price */}
                    <div>
                      <span className="font-black text-lg text-violet-500">
                        {transaction.price}
                      </span>
                    </div>

                    {/* Date */}
                    <div>
                      <div className="font-mono text-sm">
                        {new Date(transaction.date).toLocaleDateString()}
                      </div>
                      <div className="font-mono text-xs text-gray-500">
                        {new Date(transaction.date).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* No Transactions State */
          <div className="border-4 border-black p-12 text-center bg-gray-50">
            <Calendar className="mx-auto mb-6 text-gray-400" size={64} />
            <h3 className="font-black text-3xl uppercase mb-4">
              No Transactions Yet
            </h3>
            <p className="font-mono text-gray-600 mb-6">
              {searchTerm ||
              filterType !== "all" ||
              priceRange !== "all" ||
              dateFilter !== "all"
                ? "No transactions match your current filters"
                : "Start buying or selling datasets to see your transaction history"}
            </p>
            <div className="space-x-4">
              <Link
                to="/marketplace"
                className="inline-block bg-violet-500 text-white font-black px-8 py-4 border-4 border-violet-500 hover:bg-black hover:border-black transition-colors uppercase"
              >
                Browse Marketplace
              </Link>
              <Link
                to="/upload-dataset"
                className="inline-block bg-black text-white font-black px-8 py-4 border-4 border-black hover:bg-violet-500 hover:border-violet-500 transition-colors uppercase"
              >
                Upload Dataset
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
