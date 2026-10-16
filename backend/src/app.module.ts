import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { loadDatabaseOptions } from './database/database.config';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...loadDatabaseOptions(),
        retryAttempts: 3,
        retryDelay: 1000,
      }),
    }),
    ProductsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
