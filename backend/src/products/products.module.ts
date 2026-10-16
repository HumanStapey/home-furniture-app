import { Module } from '@nestjs/common';
import { ProductsImportService } from './products-import.service';
import { ProductsSeedRunner } from './products-seed.runner';
import { ProductsRepository } from './products.repository';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsRepository, ProductsImportService, ProductsSeedRunner, ProductsService],
})
export class ProductsModule {}
