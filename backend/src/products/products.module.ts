import { Module } from '@nestjs/common';
import { ProductsImportService } from './products-import.service';
import { ProductsSeedRunner } from './products-seed.runner';
import { ProductsRepository } from './products.repository';

@Module({
  providers: [ProductsRepository, ProductsImportService, ProductsSeedRunner],
})
export class ProductsModule {}
