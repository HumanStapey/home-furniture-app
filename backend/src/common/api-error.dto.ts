import { ApiProperty } from '@nestjs/swagger';
import type { ApiError } from '@home-furniture/contracts';

export class ApiErrorDto implements ApiError {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;
}
