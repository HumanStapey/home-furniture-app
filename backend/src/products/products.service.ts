import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { Category, Product, ProductsResponse } from '@home-furniture/contracts';
import { ProductEntity } from './product.entity';
import { ProductsQueryDto } from './products-query.dto';
import { ProductsRepository } from './products.repository';

function toProduct(entity: ProductEntity): Product {
  return {
    id: entity.id,
    title: entity.title,
    price: Number(entity.price),
    description: entity.description,
    category: entity.category,
    image: entity.image,
    rating: { rate: entity.ratingRate, count: entity.ratingCount },
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly repository: ProductsRepository) {}

  private unavailable(): never {
    throw new ServiceUnavailableException('The catalogue is not available yet. Please try again in a few minutes.');
  }

  async findPage(query: ProductsQueryDto): Promise<ProductsResponse> {
    const [items, total] = await this.repository.findPage(query);
    if (total === 0 && !await this.repository.hasProducts()) this.unavailable();
    return {
      items: items.map(toProduct), total, page: query.page, limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findById(id: number): Promise<Product> {
    const entity = await this.repository.findById(id);
    if (entity) return toProduct(entity);
    if (!await this.repository.hasProducts()) this.unavailable();
    throw new NotFoundException('Product not found.');
  }

  async categories(): Promise<Category[]> {
    const categories = await this.repository.categories();
    if (categories.length === 0) this.unavailable();
    return categories;
  }
}
