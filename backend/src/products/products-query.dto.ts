import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, NotContains } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ProductsQuery } from '@home-furniture/contracts';

function decimalInteger({ value }: { value: unknown }): unknown {
  return typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
}

export class ProductsQueryDto implements ProductsQuery {
  @ApiPropertyOptional({ description: 'Case-insensitive literal search in title and description', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @NotContains('\0')
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  search?: string;

  @ApiPropertyOptional({ description: 'Exact category name' })
  @IsOptional()
  @IsString()
  @NotContains('\0')
  category?: string;

  @ApiPropertyOptional({ type: 'integer', default: 1, minimum: 1, maximum: 2147483647 })
  @Transform(decimalInteger)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  page: number = 1;

  @ApiPropertyOptional({ type: 'integer', default: 12, minimum: 1, maximum: 100 })
  @Transform(decimalInteger)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 12;

  @ApiPropertyOptional({ enum: ['id', 'title', 'price'], default: 'id' })
  @IsIn(['id', 'title', 'price'])
  sort: 'id' | 'title' | 'price' = 'id';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'asc';
}

export class ProductIdDto {
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 2147483647 })
  @Transform(decimalInteger)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  id!: number;
}
