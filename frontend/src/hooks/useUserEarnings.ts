import { useReadContract } from "wagmi";
import { DATASET_NFT_CONTRACT } from "../contracts/DatasetNFT";
import { formatEther } from "viem";

export interface UseUserEarningsReturn {
  totalEarnings: string; // in SEI
  totalEarningsWei: bigint | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useUserEarnings = (
  userAddress?: string
): UseUserEarningsReturn => {
  const {
    data: totalEarningsWei,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    ...DATASET_NFT_CONTRACT,
    functionName: "getTotalEarnedByOwner",
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  const totalEarnings = totalEarningsWei ? formatEther(totalEarningsWei) : "0";

  return {
    totalEarnings,
    totalEarningsWei,
    isLoading,
    error,
    refetch,
  };
};
