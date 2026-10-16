import { ApiProperty } from '@nestjs/swagger';
import type { Product, ProductsResponse } from '@home-furniture/contracts';

class RatingResponseDto {
  @ApiProperty({ minimum: 0, maximum: 5, example: 3.9 })
  rate!: number;

  @ApiProperty({ type: 'integer', minimum: 0, example: 120 })
  count!: number;
}

export class ProductResponseDto implements Product {
  @ApiProperty({ type: 'integer', example: 1 })
  id!: number;

  @ApiProperty({ example: 'Oak chair' })
  title!: string;

  @ApiProperty({ minimum: 0, example: 109.95 })
  price!: number;

  @ApiProperty({ example: 'A comfortable chair' })
  description!: string;

  @ApiProperty({ example: 'furniture' })
  category!: string;

  @ApiProperty({ example: 'https://example.com/chair.png' })
  image!: string;

  @ApiProperty({ type: RatingResponseDto })
  rating!: RatingResponseDto;
}

export class ProductsResponseDto implements ProductsResponse {
  @ApiProperty({ type: [ProductResponseDto] })
  items!: ProductResponseDto[];

  @ApiProperty({ type: 'integer', example: 20 })
  total!: number;

  @ApiProperty({ type: 'integer', example: 1 })
  page!: number;

  @ApiProperty({ type: 'integer', example: 12 })
  limit!: number;

  @ApiProperty({ type: 'integer', example: 2 })
  totalPages!: number;
}
