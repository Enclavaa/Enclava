import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Database,
  Check,
  X,
  Bot,
  User,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getChatAgents,
  getChatAnswer,
  ChatAgent,
  AgentResponse,
  ApiError,
} from "../services/api";
import { useDatasetPayment } from "../hooks/useDatasetPayment";
import { useAccount } from "wagmi";

interface Message {
  id: string;
  type: "user" | "ai" | "system";
  content: string;
  timestamp: Date;
  suggestedAgents?: ChatAgent[];
  agentResponses?: AgentResponse[];
}

enum ChatPhase {
  INITIAL = "initial",
  AGENT_SELECTION = "agent_selection",
  PAYMENT_PROCESSING = "payment_processing",
}

const Chat: React.FC = () => {
  const { isConnected } = useAccount();
  const {
    payForDatasets,
    isPending: isPaymentPending,
    isConfirming: isPaymentConfirming,
    error: paymentError,
    hash: paymentHash,
    isSuccess: isPaymentSuccess,
    reset: resetPayment,
  } = useDatasetPayment();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "Hello! I'm your AI assistant. I can help you find and analyze relevant datasets for your questions. What would you like to explore today?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
  const [suggestedAgents, setSuggestedAgents] = useState<ChatAgent[]>([]);
  const [chatPhase, setChatPhase] = useState<ChatPhase>(ChatPhase.INITIAL);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [useScraping, setUseScraping] = useState(false);
  const [useOwnData, setUseOwnData] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle successful payment
  useEffect(() => {
    if (
      isPaymentSuccess &&
      paymentHash &&
      chatPhase === ChatPhase.PAYMENT_PROCESSING
    ) {
      const paymentSuccessMessage: Message = {
        id: Date.now().toString(),
        type: "system",
        content: `Payment successful! Transaction hash: ${paymentHash}. Now analyzing your question using the selected datasets...`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, paymentSuccessMessage]);

      // Get answer with transaction hash
      getAnswerFromSelectedDatasets(currentPrompt, paymentHash);
    }
  }, [isPaymentSuccess, paymentHash, chatPhase, currentPrompt]);

  // Handle payment errors
  useEffect(() => {
    if (paymentError && chatPhase === ChatPhase.PAYMENT_PROCESSING) {
      toast.error(`Payment failed: ${paymentError.message}`, {
        position: "top-right",
        autoClose: 5000,
      });
      setChatPhase(ChatPhase.AGENT_SELECTION);
    }
  }, [paymentError, chatPhase]);

  const handleInitialQuestion = async (prompt: string) => {
    try {
      setIsLoading(true);
      const agents = await getChatAgents(prompt);

      setSuggestedAgents(agents);
      setCurrentPrompt(prompt);

      if (agents.length === 0) {
        // No agents found
        const systemMessage: Message = {
          id: Date.now().toString(),
          type: "system",
          content:
            "I couldn't find any datasets that match your question. Please try rephrasing your question or ask about a different topic.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMessage]);
        setChatPhase(ChatPhase.INITIAL);
      } else {
        // Found agents - show suggestions
        const aiMessage: Message = {
          id: Date.now().toString(),
          type: "ai",
          content: `I found ${agents.length} relevant dataset${
            agents.length > 1 ? "s" : ""
          } for your question. Please select the dataset(s) you'd like me to analyze from the sidebar, then I'll provide insights based on your query.`,
          timestamp: new Date(),
          suggestedAgents: agents,
        };
        setMessages((prev) => [...prev, aiMessage]);
        setChatPhase(ChatPhase.AGENT_SELECTION);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(`Error: ${error.message}`, {
          position: "top-right",
          autoClose: 5000,
        });
      } else {
        toast.error("Failed to get dataset suggestions. Please try again.", {
          position: "top-right",
          autoClose: 5000,
        });
      }
      console.error("Error getting chat agents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAnswerFromSelectedDatasets = async (
    prompt: string,
    txHash: string
  ) => {
    try {
      setIsLoading(true);
      const responses = await getChatAnswer(selectedAgents, prompt, txHash);

      const aiMessage: Message = {
        id: Date.now().toString(),
        type: "ai",
        content: "Here are the insights from your selected datasets:",
        timestamp: new Date(),
        agentResponses: responses,
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Reset state after getting answer - ready for next question cycle
      setSelectedAgents([]);
      setSuggestedAgents([]);
      setChatPhase(ChatPhase.INITIAL);
      setCurrentPrompt("");
      resetPayment();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(`Error: ${error.message}`, {
          position: "top-right",
          autoClose: 5000,
        });
      } else {
        toast.error("Failed to get answer from datasets. Please try again.", {
          position: "top-right",
          autoClose: 5000,
        });
      }
      console.error("Error getting chat answer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageContent = inputMessage;
    setInputMessage("");

    // Every question starts the workflow from the beginning
    await handleInitialQuestion(messageContent);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleAgentSelection = (agentId: number) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleAnalyzeWithSelectedDatasets = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet to proceed with payment.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (selectedAgents.length === 0) {
      toast.error("Please select at least one dataset to analyze.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    const selectedAgentData = selectedAgents
      .map((id) => {
        const agent = suggestedAgents.find((agent) => agent.id === id);
        return agent;
      })
      .filter(Boolean) as ChatAgent[];

    const selectedAgentNames = selectedAgentData
      .map((agent) => agent.name)
      .join(", ");

    // Calculate total cost
    const totalCost = selectedAgentData.reduce(
      (sum, agent) => sum + agent.price,
      0
    );

    const systemMessage: Message = {
      id: Date.now().toString(),
      type: "system",
      content: `Great! You've selected ${selectedAgents.length} dataset(s): ${selectedAgentNames}. Total cost: ${totalCost} Hedera. Processing payment...`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, systemMessage]);
    setChatPhase(ChatPhase.PAYMENT_PROCESSING);

    try {
      console.log("selectedAgentData", selectedAgentData);
      // Validate that all selected agents have NFT IDs
      const agentsWithoutNftId = selectedAgentData.filter(
        (agent) => agent.nft_id === null
      );
      console.log("agentsWithoutNftId", agentsWithoutNftId);
      if (agentsWithoutNftId.length > 0) {
        toast.error(
          "Some selected datasets don't have associated NFTs. Please select different datasets.",
          {
            position: "top-right",
            autoClose: 5000,
          }
        );
        setChatPhase(ChatPhase.AGENT_SELECTION);
        return;
      }

      // Get NFT IDs and amounts for payment
      const tokenIds = selectedAgentData.map((agent) => agent.nft_id!); // Using NFT ID for payment
      const amounts = selectedAgentData.map((agent) => agent.price);

      await payForDatasets({ tokenIds, amounts });
    } catch (error) {
      toast.error("Payment failed. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
      setChatPhase(ChatPhase.AGENT_SELECTION);
      console.error("Payment error:", error);
    }
  };

  const resetChat = () => {
    setSelectedAgents([]);
    setSuggestedAgents([]);
    setChatPhase(ChatPhase.INITIAL);
    setCurrentPrompt("");
  };

  const formatFileSize = (sizeInBytes: number): string => {
    const mb = sizeInBytes / (1024 * 1024);
    if (mb < 1024) {
      return `${mb.toFixed(1)}MB`;
    }
    return `${(mb / 1024).toFixed(1)}GB`;
  };

  return (
    <div className="flex h-full bg-gray-100">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-black text-white p-4 border-b-4 border-red-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bot className="text-red-500" size={24} />
              <div>
                <h1 className="font-black text-xl uppercase">
                  AI Chat Assistant
                </h1>
                <p className="text-gray-300 text-sm font-mono">
                  Ask questions and get insights from our datasets
                </p>
              </div>
            </div>
            {chatPhase !== ChatPhase.INITIAL && (
              <button
                onClick={resetChat}
                className="px-4 py-2 bg-red-500 text-white font-black uppercase border-2 border-red-500 hover:bg-white hover:text-red-500 transition-colors rounded text-sm"
              >
                New Chat
              </button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              <div
                className={`flex ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-3xl rounded-lg p-4 ${
                    message.type === "user"
                      ? "bg-red-500 text-white font-mono"
                      : message.type === "system"
                      ? "bg-yellow-100 border-2 border-yellow-400 text-black"
                      : "bg-white border-2 border-gray-200 text-black"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {message.type === "ai" && (
                      <Bot
                        className="text-red-500 mt-1 flex-shrink-0"
                        size={20}
                      />
                    )}
                    {message.type === "user" && (
                      <User
                        className="text-white mt-1 flex-shrink-0"
                        size={20}
                      />
                    )}
                    {message.type === "system" && (
                      <AlertCircle
                        className="text-yellow-600 mt-1 flex-shrink-0"
                        size={20}
                      />
                    )}
                    <div className="flex-1">
                      <p className="whitespace-pre-wrap">{message.content}</p>

                      {/* Display agent responses */}
                      {message.agentResponses && (
                        <div className="mt-4 space-y-3">
                          {message.agentResponses.map((response, index) => {
                            const agent = suggestedAgents.find(
                              (a) => a.id === response.agent_id
                            );
                            return (
                              <div
                                key={index}
                                className="border-l-4 border-red-500 pl-4 bg-gray-50 p-3 rounded"
                              >
                                <h4 className="font-black text-sm text-red-600 uppercase mb-2">
                                  {agent?.name ||
                                    `Dataset ${response.agent_id}`}
                                </h4>
                                <p className="text-sm text-gray-800">
                                  {response.response}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <p
                        className={`text-xs mt-2 ${
                          message.type === "user"
                            ? "text-red-100"
                            : "text-gray-500"
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-3xl rounded-lg p-4 bg-white border-2 border-gray-200">
                <div className="flex items-center space-x-3">
                  <Bot className="text-red-500" size={20} />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">Processing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t-4 border-red-500 p-4">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  chatPhase === ChatPhase.INITIAL
                    ? "Ask me anything about the available datasets..."
                    : "Select datasets from the sidebar to get your answer..."
                }
                className="w-full p-3 border-2 border-gray-300 rounded-lg font-mono text-black placeholder-gray-500 focus:border-red-500 focus:outline-none resize-none"
                rows={2}
                disabled={isLoading || chatPhase === ChatPhase.AGENT_SELECTION}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={
                !inputMessage.trim() ||
                isLoading ||
                chatPhase === ChatPhase.AGENT_SELECTION
              }
              className="px-6 py-3 bg-red-500 text-white font-black uppercase border-2 border-red-500 hover:bg-white hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Dataset Selection */}
      <div className="w-80 bg-white border-l-4 border-red-500 flex flex-col">
        <div className="bg-black text-white p-4">
          <div className="flex items-center space-x-3">
            <Database className="text-red-500" size={20} />
            <h2 className="font-black uppercase">Dataset Selection</h2>
          </div>
          {selectedAgents.length > 0 &&
            (chatPhase === ChatPhase.AGENT_SELECTION ||
              chatPhase === ChatPhase.PAYMENT_PROCESSING) && (
              <div className="mt-3">
                {chatPhase === ChatPhase.AGENT_SELECTION && (
                  <button
                    onClick={handleAnalyzeWithSelectedDatasets}
                    disabled={!isConnected}
                    className="w-full px-4 py-2 bg-red-500 text-white font-black uppercase border-2 border-red-500 hover:bg-white hover:text-red-500 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CreditCard className="inline mr-2" size={16} />
                    Pay & Analyze ({selectedAgents.length})
                  </button>
                )}

                {chatPhase === ChatPhase.PAYMENT_PROCESSING && (
                  <div className="space-y-2">
                    <div className="w-full px-4 py-2 bg-yellow-500 text-black font-black uppercase border-2 border-yellow-500 rounded text-center">
                      {isPaymentPending && "Confirm Payment in Wallet..."}
                      {isPaymentConfirming && "Processing Payment..."}
                      {isPaymentSuccess && "Payment Successful!"}
                    </div>
                    {(isPaymentPending || isPaymentConfirming) && (
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                      </div>
                    )}
                  </div>
                )}

                {!isConnected && (
                  <p className="text-red-500 text-xs mt-2 font-mono text-center">
                    Connect wallet to proceed with payment
                  </p>
                )}
              </div>
            )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {suggestedAgents.length > 0 ? (
            <div>
              <h3 className="font-black text-red-500 uppercase mb-3 text-sm">
                Suggested Datasets for Your Query
              </h3>
              <div className="space-y-3">
                {suggestedAgents.map((agent) => {
                  const isSelected = selectedAgents.includes(agent.id);
                  return (
                    <div
                      key={agent.id}
                      onClick={() => toggleAgentSelection(agent.id)}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "border-green-500 bg-green-50"
                          : "border-yellow-400 bg-yellow-50 hover:border-yellow-500"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-black text-sm uppercase text-black">
                            {agent.name}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1 font-mono">
                            {agent.description}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="px-2 py-1 bg-gray-200 text-black text-xs font-mono rounded">
                              {agent.category}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                              {formatFileSize(agent.dataset_size)}
                            </span>
                            <span className="text-xs text-green-600 font-mono font-black">
                              💰 {agent.price} Hedera
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 font-mono mt-1">
                            Status:{" "}
                            <span className="uppercase font-black">
                              {agent.status}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          {isSelected ? (
                            <Check className="text-green-500" size={20} />
                          ) : (
                            <Database className="text-gray-400" size={20} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500 font-mono text-sm">
                {chatPhase === ChatPhase.INITIAL
                  ? "Ask a question to see relevant datasets"
                  : "No datasets found for your query"}
              </p>
            </div>
          )}
        </div>

        {/* Options Section - Bottom of Sidebar */}
        <div className="border-t-2 border-red-200 bg-gray-50 p-4 flex flex-col gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useScraping}
              onChange={() => setUseScraping(!useScraping)}
              className="accent-red-500 w-5 h-5 rounded focus:ring-2 focus:ring-red-500"
            />
            <span className="font-mono text-sm text-black">
              Use Web Scraping
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useOwnData}
              onChange={() => setUseOwnData(!useOwnData)}
              className="accent-red-500 w-5 h-5 rounded focus:ring-2 focus:ring-red-500"
            />
            <span className="font-mono text-sm text-black">
              Use Your Own Data
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default Chat;
