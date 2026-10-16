import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductEntity } from './product.entity';

@Injectable()
export class ProductsRepository {
  constructor(private readonly source: DataSource) {}

  async importBatch(products: ProductEntity[]): Promise<void> {
    await this.source.transaction(async manager => {
      await manager.getRepository(ProductEntity).upsert(products, {
        conflictPaths: ['id'],
        skipUpdateIfNoValuesChanged: true,
      });
    });
  }
}
