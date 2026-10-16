import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProducts1792110633249 implements MigrationInterface {
  name = 'CreateProducts1792110633249';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" integer NOT NULL,
        "title" text NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "description" text NOT NULL,
        "category" text NOT NULL,
        "image" text NOT NULL,
        "rating_rate" double precision NOT NULL,
        "rating_count" integer NOT NULL,
        CONSTRAINT "products_rating_count_nonnegative" CHECK ("rating_count" >= 0),
        CONSTRAINT "products_rating_rate_range" CHECK ("rating_rate" >= 0 AND "rating_rate" <= 5),
        CONSTRAINT "products_image_not_blank" CHECK (length(btrim("image")) > 0),
        CONSTRAINT "products_category_not_blank" CHECK (length(btrim("category")) > 0),
        CONSTRAINT "products_title_not_blank" CHECK (length(btrim("title")) > 0),
        CONSTRAINT "products_price_range" CHECK ("price" >= 0 AND "price" <= 9999999999.99),
        CONSTRAINT "products_id_positive" CHECK ("id" > 0),
        CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "products"');
  }
}
