import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { createPublicClient, http, PublicClient } from 'viem';
import { avalancheFuji } from 'viem/chains';
import SIMPLE_STORAGE from './simple-storage.json';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { ApiResponseDto } from '../common/dto/api-response.dto';

@Injectable()
export class BlockchainService {
  private client: PublicClient;
  private contractAddress: `0x${string}`;

  constructor() {
    // Using reliable RPC endpoints - Try multiple options
    // Priority: 1) Environment variable, 2) Ankr (most reliable), 3) Official
    const rpcUrl =
      process.env.BLOCKCHAIN_RPC_URL || 
      'https://rpc.ankr.com/avalanche_fuji'; // Ankr RPC - most reliable

    console.log('===========================================');
    console.log('Initializing Blockchain Service');
    console.log('RPC URL:', rpcUrl);
    console.log('Chain ID:', avalancheFuji.id);
    console.log('Chain Name:', avalancheFuji.name);
    console.log('===========================================');

    // Force override chain RPC URLs to use our custom RPC
    const customChain = {
      ...avalancheFuji,
      rpcUrls: {
        default: {
          http: [rpcUrl],
        },
        public: {
          http: [rpcUrl],
        },
      },
    };

    // Explicitly use our RPC URL in transport
    this.client = createPublicClient({
      chain: customChain,
      transport: http(rpcUrl, {
        timeout: 30000, // 30 seconds timeout
        retryCount: 3,
        retryDelay: 1000,
      }),
    });

    this.contractAddress = (process.env.CONTRACT_ADDRESS ||
      '0x5f329c7c45318a8c7c42ef80b8f7ef55ddca9d5b') as `0x${string}`;

    console.log(
      'Blockchain Service initialized. Contract address:',
      this.contractAddress,
      'on Chain ID:',
      avalancheFuji.id,
    );
  }

  async getLatestValue(): Promise<ApiResponseDto<{ value: string }>> {
    try {
      console.log('Fetching latest value from contract:', this.contractAddress);

      // First, verify we can connect to the RPC
      const blockNumber = await this.client.getBlockNumber();
      console.log('Connected to blockchain. Latest block:', blockNumber.toString());

      // Check if contract exists by checking code at address
      const code = await this.client.getBytecode({
        address: this.contractAddress,
      });

      if (!code || code === '0x') {
        throw new BadRequestException({
          statusCode: 400,
          message: `No contract code found at address ${this.contractAddress}. Please verify the contract is deployed on Avalanche Fuji testnet (Chain ID: ${avalancheFuji.id}).`,
          data: null,
          timestamp: new Date().toISOString(),
        });
      }

      console.log('Contract code found at address');

      // Check if contract exists by trying to read from it
      const value: bigint = (await this.client.readContract({
        address: this.contractAddress,
        abi: SIMPLE_STORAGE.abi,
        functionName: 'getValue',
      })) as bigint;

      console.log('Latest value retrieved:', value.toString());

      return {
        statusCode: 200,
        message: 'Latest value retrieved successfully',
        data: {
          value: value.toString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error in getLatestValue:', error);
      
      // If it's already a BadRequestException, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for specific error types
      if (errorMessage.includes('execution reverted') || 
          errorMessage.includes('contract does not exist') ||
          errorMessage.includes('Contract not found') ||
          errorMessage.includes('No contract code')) {
        throw new BadRequestException({
          statusCode: 400,
          message: `Contract not found at address ${this.contractAddress}. Please verify the contract is deployed on Avalanche Fuji testnet (Chain ID: ${avalancheFuji.id}).`,
          data: null,
          timestamp: new Date().toISOString(),
        });
      }

      // Use handleRpcError for RPC connection issues
      this.handleRpcError(error);
    }
  }

  async getValueUpdatedEvents(
    fromBlock: number | string = 0,
    toBlock: number | string = 'latest',
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponseDto<any[]>> {
    try {
      console.log('Fetching events with params:', {
        fromBlock,
        toBlock,
        page,
        limit,
      });

      // Verify contract exists first
      const code = await this.client.getBytecode({
        address: this.contractAddress,
      });

      if (!code || code === '0x') {
        throw new BadRequestException({
          statusCode: 400,
          message: `No contract code found at address ${this.contractAddress}. Please verify the contract is deployed on Avalanche Fuji testnet (Chain ID: ${avalancheFuji.id}).`,
          data: null,
          timestamp: new Date().toISOString(),
        });
      }

      // Get latest block number if toBlock is 'latest'
      let toBlockNum: bigint;
      if (toBlock === 'latest') {
        console.log('Getting latest block number...');
        const latestBlockNumber = await this.client.getBlockNumber();
        console.log('Latest block number:', latestBlockNumber);
        toBlockNum = latestBlockNumber;
      } else {
        toBlockNum = BigInt(
          typeof toBlock === 'string' ? parseInt(toBlock) : toBlock,
        );
      }

      const fromBlockInput = BigInt(
        typeof fromBlock === 'string' ? parseInt(fromBlock) : fromBlock,
      );

      // RPC LIMIT HANDLING:
      // Most public RPCs limit the range of blocks for getLogs (e.g. 2048 or 50000).
      // If the range is too large (e.g. from 0 to latest), we automatically adjust it
      // to fetch only the recent history.
      const MAX_BLOCK_RANGE = 40000n; // Safe limit below 50000
      let safeFromBlock = fromBlockInput;

      if (toBlockNum - fromBlockInput > MAX_BLOCK_RANGE) {
        console.log(
          `Block range too large (${toBlockNum - fromBlockInput}). limiting to last ${MAX_BLOCK_RANGE} blocks.`,
        );
        safeFromBlock = toBlockNum - MAX_BLOCK_RANGE;
        if (safeFromBlock < 0n) safeFromBlock = 0n;
      }

      console.log(
        'Fetching logs from block:',
        safeFromBlock.toString(),
        'to:',
        toBlockNum.toString(),
      );

      const events = await this.client.getLogs({
        address: this.contractAddress,
        event: {
          type: 'event',
          name: 'ValueUpdated',
          inputs: [
            {
              name: 'newValue',
              type: 'uint256',
              indexed: false,
            },
          ],
        },
        fromBlock: safeFromBlock,
        toBlock: toBlockNum,
      });

      console.log('Events found:', events.length);

      const formattedEvents = events.map((event) => ({
        blockNumber: event.blockNumber?.toString(),
        value: event.args.newValue?.toString(),
        txHash: event.transactionHash,
        logIndex: event.logIndex,
      }));

      const totalItems = formattedEvents.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedEvents = formattedEvents.slice(startIndex, endIndex);

      return {
        statusCode: 200,
        message: 'Events retrieved successfully',
        data: paginatedEvents,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error in getValueUpdatedEvents:', error);
      
      // If it's already a BadRequestException, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Check for specific error types
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('execution reverted') || 
          errorMessage.includes('contract does not exist') ||
          errorMessage.includes('Contract not found') ||
          errorMessage.includes('No contract code')) {
        throw new BadRequestException({
          statusCode: 400,
          message: `Contract not found at address ${this.contractAddress}. Please verify the contract is deployed on Avalanche Fuji testnet (Chain ID: ${avalancheFuji.id}).`,
          data: null,
          timestamp: new Date().toISOString(),
        });
      }

      // Use handleRpcError for RPC connection issues
      this.handleRpcError(error);
    }
  }

  private handleRpcError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);

    console.error('RPC Error Details:', {
      message,
      error: JSON.stringify(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (message.includes('timeout') || message.includes('Timeout')) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        message: 'RPC timeout. Please try again later.',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('failed') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT') ||
      message.includes('socket') ||
      message.includes('HTTP request failed') ||
      message.includes('503') ||
      message.includes('Service Unavailable')
    ) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        message: `Unable to connect to blockchain RPC. Please check: 1) RPC endpoint is accessible, 2) Internet connection, 3) Try setting BLOCKCHAIN_RPC_URL environment variable. Error: ${message}`,
        data: {
          rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
          chainId: avalancheFuji.id,
          chainName: avalancheFuji.name,
        },
        timestamp: new Date().toISOString(),
      });
    }

    throw new InternalServerErrorException({
      statusCode: 500,
      message: `An error occurred while reading blockchain data: ${message}`,
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
}
