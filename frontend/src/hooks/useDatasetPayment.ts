import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, parseUnits } from "viem";
import { DATASET_NFT_CONTRACT } from "../contracts/DatasetNFT";

export interface PaymentData {
  tokenIds: number[];
  amounts: number[]; // amounts in Hedera
}

export interface UseDatasetPaymentReturn {
  payForDatasets: (data: PaymentData) => Promise<void>;
  isPending: boolean;
  isConfirming: boolean;
  error: Error | null;
  hash: string | undefined;
  receipt: any;
  isSuccess: boolean;
  reset: () => void;
}

export const useDatasetPayment = (): UseDatasetPaymentReturn => {
  const {
    writeContract,
    isPending,
    error: writeError,
    data: hash,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const payForDatasets = async (data: PaymentData): Promise<void> => {
    try {
      // Reset previous state
      reset();

      // Validate input data
      if (data.tokenIds.length !== data.amounts.length) {
        throw new Error(
          "Token IDs and amounts arrays must have the same length",
        );
      }

      if (data.tokenIds.length === 0) {
        throw new Error("At least one dataset must be selected");
      }

      // Convert amounts from Hedera to wei (18 decimals)
      const amountsInWei = data.amounts.map((amount) =>
        parseUnits(amount.toString(), 8),
      );

      // Calculate total payment amount
      const totalPayment = amountsInWei.reduce(
        (sum, amount) => sum + amount,
        0n,
      );

      console.log("totalPayment: ", totalPayment);

      // Call the smart contract
      writeContract({
        ...DATASET_NFT_CONTRACT,
        functionName: "payForMultipleDatasets",
        args: [
          data.tokenIds.map((id) => BigInt(id)), // Convert to BigInt for uint256[]
          amountsInWei, // Already in wei as BigInt[]
        ],
        value: parseUnits(totalPayment.toString(), 10), // Send the total payment amount
      });
    } catch (error) {
      console.error("Payment failed:", error);
      throw error;
    }
  };

  return {
    payForDatasets,
    isPending,
    isConfirming,
    error: writeError || receiptError,
    hash,
    receipt,
    isSuccess,
    reset,
  };
};
