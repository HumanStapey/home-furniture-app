import source from './database/data-source';
import { ProductsImportService } from './products/products-import.service';
import { ProductsRepository } from './products/products.repository';

async function seed(): Promise<void> {
  try {
    await source.initialize();
    if (await source.showMigrations()) {
      throw new Error('Apply pending migrations with npm run migration:run before seeding.');
    }
    const importer = new ProductsImportService(new ProductsRepository(source));
    const count = await importer.import();
    console.log(`Catalogue import completed: ${count} products received.`);
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Catalogue import failed.');
  process.exitCode = 1;
});
