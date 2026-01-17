import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
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
    description: 'Timestamp when response was generated',
    example: '2026-01-16T10:30:00Z',
  })
  timestamp: string;
}
