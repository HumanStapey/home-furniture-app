import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('products')
@Check('products_id_positive', '"id" > 0')
@Check('products_price_range', '"price" >= 0 AND "price" <= 9999999999.99')
@Check('products_title_not_blank', 'length(btrim("title")) > 0')
@Check('products_category_not_blank', 'length(btrim("category")) > 0')
@Check('products_image_not_blank', 'length(btrim("image")) > 0')
@Check('products_rating_rate_range', '"rating_rate" >= 0 AND "rating_rate" <= 5')
@Check('products_rating_count_nonnegative', '"rating_count" >= 0')
export class ProductEntity {
  @PrimaryColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text' })
  category!: string;

  @Column({ type: 'text' })
  image!: string;

  @Column({ name: 'rating_rate', type: 'double precision' })
  ratingRate!: number;

  @Column({ name: 'rating_count', type: 'integer' })
  ratingCount!: number;
}
