import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsDefined, IsInt, IsNumber, IsObject, IsString, IsUrl,
  Matches, Max, Min, ValidateNested, validateSync,
} from 'class-validator';
import { ProductEntity } from './product.entity';

class FakeStoreRatingDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(5)
  rate!: number;

  @IsInt()
  @Min(0)
  @Max(2147483647)
  count!: number;
}

class FakeStoreProductDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  id!: number;

  @IsString()
  @Matches(/\S/)
  title!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(9999999999.99)
  price!: number;

  @IsString()
  description!: string;

  @IsString()
  @Matches(/\S/)
  category!: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  image!: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => FakeStoreRatingDto)
  rating!: FakeStoreRatingDto;
}

export function parseProducts(payload: unknown): ProductEntity[] {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error('Fake Store API must return a nonempty product array.');
  }

  const identifiers = new Set<number>();
  return payload.map((value: unknown, index: number) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Fake Store API product at index ${index} is invalid.`);
    }
    const product = plainToInstance(FakeStoreProductDto, value);
    const errors = validateSync(product, { whitelist: true, forbidUnknownValues: true });
    if (errors.length > 0 || identifiers.has(product.id)
      || Number(product.price.toFixed(2)) !== product.price) {
      throw new Error(`Fake Store API product at index ${index} is invalid or duplicated.`);
    }
    identifiers.add(product.id);
    return Object.assign(new ProductEntity(), {
      id: product.id,
      title: product.title,
      price: product.price.toFixed(2),
      description: product.description,
      category: product.category,
      image: product.image,
      ratingRate: product.rating.rate,
      ratingCount: product.rating.count,
    });
  });
}
