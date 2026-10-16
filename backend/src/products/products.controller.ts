import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse,
  ApiOkResponse, ApiOperation, ApiParam, ApiServiceUnavailableResponse, ApiTags,
} from '@nestjs/swagger';
import type { Category, Product, ProductsResponse } from '@home-furniture/contracts';
import { ApiErrorDto } from '../common/api-error.dto';
import { ProductResponseDto, ProductsResponseDto } from './product-response.dto';
import { ProductIdDto, ProductsQueryDto } from './products-query.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@ApiServiceUnavailableResponse({ description: 'No local catalogue is available yet', type: ApiErrorDto })
@ApiInternalServerErrorResponse({ description: 'Unexpected server error', type: ApiErrorDto })
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Search, filter, sort and paginate the local catalogue' })
  @ApiOkResponse({ type: ProductsResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  findPage(@Query() query: ProductsQueryDto): Promise<ProductsResponse> {
    return this.service.findPage(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List distinct categories in alphabetical order' })
  @ApiOkResponse({ type: String, isArray: true })
  categories(): Promise<Category[]> {
    return this.service.categories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by its Fake Store ID' })
  @ApiParam({ name: 'id', schema: { type: 'integer', minimum: 1, maximum: 2147483647 } })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  findById(@Param() parameters: ProductIdDto): Promise<Product> {
    return this.service.findById(parameters.id);
  }
}
