import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductEntity } from './product.entity';
import { ProductsQueryDto } from './products-query.dto';

@Injectable()
export class ProductsRepository {
  constructor(private readonly source: DataSource) {}

  hasProducts(): Promise<boolean> {
    return this.source.getRepository(ProductEntity).exists();
  }

  findById(id: number): Promise<ProductEntity | null> {
    return this.source.getRepository(ProductEntity).findOneBy({ id });
  }

  async categories(): Promise<string[]> {
    const rows = await this.source.getRepository(ProductEntity)
      .createQueryBuilder('product')
      .select('product.category', 'category')
      .distinct(true)
      .orderBy('product.category', 'ASC')
      .getRawMany<{ category: string }>();
    return rows.map(row => row.category);
  }

  findPage(query: ProductsQueryDto): Promise<[ProductEntity[], number]> {
    const builder = this.source.getRepository(ProductEntity).createQueryBuilder('product');
    if (query.category) builder.andWhere('product.category = :category', { category: query.category });
    if (query.search) {
      builder.andWhere("strpos(lower(product.title || ' ' || product.description), lower(:search)) > 0", {
        search: query.search,
      });
    }
    const columns = { id: 'product.id', title: 'product.title', price: 'product.price' };
    builder.orderBy(columns[query.sort], query.order === 'asc' ? 'ASC' : 'DESC');
    if (query.sort !== 'id') builder.addOrderBy('product.id', 'ASC');
    return builder.skip((query.page - 1) * query.limit).take(query.limit).getManyAndCount();
  }

  async importBatch(products: ProductEntity[]): Promise<void> {
    await this.source.transaction(async manager => {
      await manager.getRepository(ProductEntity).upsert(products, {
        conflictPaths: ['id'],
        skipUpdateIfNoValuesChanged: true,
      });
    });
  }
}
