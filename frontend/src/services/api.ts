const BASE_URL = "https://enclava.eaglefi.io";

export interface GenerateDatasetDetailsRequest {
  file: File;
}

export interface GenerateDatasetDetailsResponse {
  category: string;
  description: string;
  message: string;
  name: string;
  success: true;
}

export interface UploadDatasetRequest {
  name: string;
  description: string;
  category: string;
  dataset_price: number;
  user_address: string;
  file: File;
}

export interface UploadDatasetSuccessResponse {
  dataset_id: number;
  file_id: string;
  file_size: number;
  filename: string;
  message: string;
  metadata: any;
  row_count: number;
  success: true;
}

export interface UploadDatasetErrorResponse {
  error_code: string;
  message: string;
  success: boolean;
}

export type UploadDatasetResponse =
  | UploadDatasetSuccessResponse
  | UploadDatasetErrorResponse;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const generateDatasetDetails = async (
  file: File
): Promise<GenerateDatasetDetailsResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${BASE_URL}/dataset/details/generate`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      let errorMessage = result.message || "An error occurred";

      switch (response.status) {
        case 400:
          errorMessage = `Bad request: ${result.message}`;
          break;
        case 413:
          errorMessage = `File too large: ${result.message}`;
          break;
        case 500:
          errorMessage = `Server error: ${result.message}`;
          break;
        default:
          errorMessage = `Error ${response.status}: ${result.message}`;
      }

      throw new ApiError(
        errorMessage,
        response.status,
        "error_code" in result ? result.error_code : undefined
      );
    }

    if (result.success) {
      return result as GenerateDatasetDetailsResponse;
    } else {
      throw new ApiError(
        result.message || "Failed to generate dataset details",
        response.status
      );
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      error instanceof Error ? error.message : "Network error occurred",
      0
    );
  }
};

export const uploadDataset = async (
  data: UploadDatasetRequest
): Promise<UploadDatasetSuccessResponse> => {
  const formData = new FormData();

  // Append all required fields to FormData
  formData.append("name", data.name);
  formData.append("description", data.description);
  formData.append("category", data.category);
  formData.append("dataset_price", data.dataset_price.toString());
  formData.append("user_address", data.user_address);
  formData.append("file", data.file);

  try {
    const response = await fetch(`${BASE_URL}/dataset/upload`, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header, let the browser set it with boundary for multipart/form-data
    });

    const result: UploadDatasetResponse = await response.json();

    if (!response.ok) {
      // Handle different error status codes
      let errorMessage = result.message || "An error occurred";

      switch (response.status) {
        case 400:
          errorMessage = `Bad request: ${result.message}`;
          break;
        case 413:
          errorMessage = `File too large: ${result.message}`;
          break;
        case 500:
          errorMessage = `Server error: ${result.message}`;
          break;
        default:
          errorMessage = `Error ${response.status}: ${result.message}`;
      }

      throw new ApiError(
        errorMessage,
        response.status,
        "error_code" in result ? result.error_code : undefined
      );
    }

    if ("success" in result && result.success) {
      return result as UploadDatasetSuccessResponse;
    } else {
      throw new ApiError(
        result.message || "Upload failed",
        response.status,
        "error_code" in result ? result.error_code : undefined
      );
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors or other fetch errors
    throw new ApiError(
      error instanceof Error ? error.message : "Network error occurred",
      0
    );
  }
};

// Chat API Interfaces
export interface ChatAgent {
  id: number;
  name: string;
  description: string;
  price: number;
  owner_id: number;
  dataset_path: string;
  category: string;
  dataset_size: number;
  nft_id: number | null;
  nft_tx: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChatAgentsRequest {
  prompt: string;
}

export interface ChatAgentsResponse {
  agents: ChatAgent[];
}

export interface ChatAnswerRequest {
  agent_ids: number[];
  prompt: string;
  tx_hashes: string[];
}

export interface AgentResponse {
  agent_id: number;
  prompt: string;
  response: string;
}

export interface ChatAnswerResponse {
  agent_responses: AgentResponse[];
  success: boolean;
}

// Chat API Functions
export const getChatAgents = async (prompt: string): Promise<ChatAgent[]> => {
  try {
    const response = await fetch(`${BASE_URL}/chat/agents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch chat agents: ${response.statusText}`,
        response.status
      );
    }

    const result: ChatAgentsResponse = await response.json();
    return result.agents;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network error occurred",
      0
    );
  }
};

export const getChatAnswer = async (
  agentIds: number[],
  prompt: string,
  txHash: string
): Promise<AgentResponse[]> => {
  try {
    const response = await fetch(`${BASE_URL}/chat/agents/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_ids: agentIds,
        prompt,
        tx_hash: txHash,
      }),
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to get chat answer: ${response.statusText}`,
        response.status
      );
    }

    const result: ChatAnswerResponse = await response.json();

    if (!result.success) {
      throw new ApiError("Chat answer request failed", response.status);
    }

    return result.agent_responses;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network error occurred",
      0
    );
  }
};

// Marketplace API Interfaces
export interface MarketplaceDataset {
  id: number;
  name: string;
  description: string;
  price: number;
  owner_id: number;
  owner_address: string;
  dataset_path: string;
  category: string;
  dataset_size: number;
  nft_id: number | null;
  nft_tx: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GetDatasetsRequest {
  search?: string;
  category?: string;
}

// Marketplace API Functions
export const getMarketplaceDatasets = async (
  params?: GetDatasetsRequest
): Promise<MarketplaceDataset[]> => {
  try {
    const queryParams = new URLSearchParams();

    if (params?.search) {
      queryParams.append("search", params.search);
    }

    if (params?.category && params.category !== "All Categories") {
      queryParams.append("category", params.category);
    }

    const url = `${BASE_URL}/agents${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch marketplace datasets: ${response.statusText}`,
        response.status
      );
    }

    const result: MarketplaceDataset[] = await response.json();
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network error occurred",
      0
    );
  }
};

// Profile API Interfaces
export interface UserProfileResponse {
  sucess: boolean;
  message: string;
  agents: MarketplaceDataset[];
}

// Profile API Functions
export const getUserProfile = async (
  userAddress: string
): Promise<MarketplaceDataset[]> => {
  try {
    const response = await fetch(`${BASE_URL}/users/${userAddress}/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch user profile: ${response.statusText}`,
        response.status
      );
    }

    const result: UserProfileResponse = await response.json();

    if (!result.sucess) {
      throw new ApiError("Failed to retrieve user profile", response.status);
    }

    return result.agents;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network error occurred",
      0
    );
  }
};

// Dataset Details API Functions
export const getDatasetDetails = async (
  datasetId: number
): Promise<MarketplaceDataset> => {
  try {
    const response = await fetch(`${BASE_URL}/agents/${datasetId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch dataset details: ${response.statusText}`,
        response.status
      );
    }

    const result: MarketplaceDataset = await response.json();
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network error occurred",
      0
    );
  }
};
