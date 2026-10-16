const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { DataSource, MigrationExecutor } = require('typeorm');
const { loadDatabaseOptions } = require('../../dist/database/database.config');
const { ProductEntity } = require('../../dist/products/product.entity');
const { parseProducts } = require('../../dist/products/fake-store-product.dto');
const { ProductsRepository } = require('../../dist/products/products.repository');
const { ProductsImportService } = require('../../dist/products/products-import.service');

const product = {
  id: 1, title: 'Chair', price: 109.95, description: 'A comfortable chair',
  category: 'furniture', image: 'https://example.com/chair.png', rating: { rate: 3.9, count: 120 },
};

test('imports new and changed products, skips identical rows and preserves data on failure', async t => {
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  const source = new DataSource({ ...loadDatabaseOptions(), schema });
  await source.initialize();
  const runner = source.createQueryRunner();
  try {
    await runner.startTransaction();
    await runner.createSchema(schema);
    await runner.query(`SET LOCAL search_path TO "${schema}"`);
    await new MigrationExecutor(source, runner).executePendingMigrations();
    await runner.commitTransaction();
    const repository = new ProductsRepository(source);
    const importer = new ProductsImportService(repository);
    let payload = [product, { ...product, id: 9, title: 'Retained chair' }];
    t.mock.method(globalThis, 'fetch', async () => Response.json(payload));
    assert.equal(await importer.import(), 2);
    payload = [{ ...product, title: 'Updated chair', price: 99.99 }, { ...product, id: 2 }];
    assert.equal(await importer.import(), 2);
    const rows = source.getRepository(ProductEntity);
    assert.equal(await rows.count(), 3);
    assert.equal((await rows.findOneByOrFail({ id: 1 })).price, '99.99');
    assert.equal((await rows.findOneByOrFail({ id: 9 })).title, 'Retained chair');
    const versions = () => source.query(`SELECT id, xmin::text AS version FROM "${schema}".products ORDER BY id`);
    const before = await versions();
    await importer.import();
    assert.deepEqual(await versions(), before);

    for (const invalid of [[], [product, product], [product, { ...product, id: 3, price: 1.001 }]]) {
      payload = invalid;
      await assert.rejects(importer.import(), /Fake Store/);
      assert.deepEqual(await versions(), before);
    }
    const batch = parseProducts([{ ...product, title: 'Must roll back' }, { ...product, id: 3 }]);
    batch[1].price = '-0.01';
    await assert.rejects(repository.importBatch(batch), { code: '23514' });
    assert.deepEqual(await versions(), before);
    assert.equal((await rows.findOneByOrFail({ id: 1 })).title, 'Updated chair');
    t.mock.method(globalThis, 'fetch', async () => new Response('Unavailable', { status: 503 }));
    await assert.rejects(importer.import(), /HTTP 503/);
    assert.deepEqual(await versions(), before);
  } finally {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await source.destroy();
  }
});
