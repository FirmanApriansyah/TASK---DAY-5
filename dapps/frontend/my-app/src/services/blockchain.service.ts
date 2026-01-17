// src/services/blockchain.service.ts
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export async function getBlockchainValue(): Promise<ApiResponse<{ value: string }>> {
  try {
    const res = await fetch(`${BACKEND_URL}/blockchain/value`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch blockchain value: ${res.status} ${errorText}`);
    }

    const data: ApiResponse<{ value: string }> = await res.json();
    
    // Validasi struktur data
    if (!data || typeof data !== 'object') {
      throw new Error("Invalid response format: data is not an object");
    }
    
    if (!data.data || typeof data.data !== 'object') {
      throw new Error("Invalid response format: data.data is missing or invalid");
    }
    
    if (typeof data.data.value === 'undefined') {
      throw new Error("Invalid response format: data.data.value is missing");
    }

    return data;
  } catch (error) {
    console.error("Error in getBlockchainValue:", error);
    throw error;
  }
}

interface BlockchainEvent {
  blockNumber: string;
  value: string;
  txHash: string;
  logIndex: number;
}

export async function getBlockchainEvents(): Promise<ApiResponse<BlockchainEvent[]>> {
  try {
    const res = await fetch(`${BACKEND_URL}/blockchain/events`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch blockchain events: ${res.status} ${errorText}`);
    }

    const data: ApiResponse<any[]> = await res.json();
    
    // Validasi struktur data
    if (!data || typeof data !== 'object') {
      throw new Error("Invalid response format: data is not an object");
    }
    
    if (!Array.isArray(data.data)) {
      throw new Error("Invalid response format: data.data is not an array");
    }

    return data;
  } catch (error) {
    console.error("Error in getBlockchainEvents:", error);
    throw error;
  }
}
