import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Response message',
    example: 'Success',
  })
  message: string;

  @ApiProperty({
    description: 'Actual data payload',
  })
  data: T;

  @ApiProperty({
    description: 'Pagination information',
    example: {
      currentPage: 1,
      pageSize: 10,
      totalItems: 100,
      totalPages: 10,
      hasNextPage: true,
      hasPrevPage: false,
    },
  })
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };

  @ApiProperty({
    description: 'Timestamp when response was generated',
    example: '2026-01-16T10:30:00Z',
  })
  timestamp: string;
}
