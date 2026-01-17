import { Controller, Get, Query } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('value')
  async getValue() {
    return this.blockchainService.getLatestValue();
  }

  @Get('events')
  async getEvents(@Query() query: Record<string, any>) {
    const fromBlock = parseInt((query.fromBlock as string) || '0');
    const toBlock = (query.toBlock as string) || 'latest';
    const page = parseInt((query.page as string) || '1');
    const limit = parseInt((query.limit as string) || '10');

    return this.blockchainService.getValueUpdatedEvents(
      fromBlock,
      toBlock,
      page,
      limit,
    );
  }
}
