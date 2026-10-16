const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { DataSource, Table } = require('typeorm');
const { loadDatabaseOptions } = require('../../dist/database/database.config');
const { ProductEntity } = require('../../dist/products/product.entity');

test('stores exact prices and enforces product constraints without keeping test data', async () => {
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  const source = new DataSource({ ...loadDatabaseOptions(), schema });
  await source.initialize();
  const runner = source.createQueryRunner();
  try {
    await runner.startTransaction();
    await runner.createSchema(schema);
    await runner.createTable(Table.create(source.getMetadata(ProductEntity), source.driver));
    const repository = runner.manager.getRepository(ProductEntity);
    const product = {
      id: 1, title: 'Chair', description: 'A comfortable chair', category: 'furniture',
      image: 'https://example.com/chair.png', price: '109.95', ratingRate: 3.9, ratingCount: 120,
    };
    await repository.insert(product);
    const stored = await repository.findOneByOrFail({ id: 1 });
    assert.equal(stored.price, '109.95');
    assert.equal(stored.ratingRate, 3.9);
    assert.equal(stored.ratingCount, 120);

    for (const price of ['0.00', '0.10', '9999999999.99']) {
      await repository.update(1, { price });
      assert.equal((await repository.findOneByOrFail({ id: 1 })).price, price);
    }

    const invalid = [
      [{ id: 0 }, '23514'], [{ id: -1 }, '23514'], [{ id: 1 }, '23505'],
      [{ id: 2147483648 }, '22003'], [{ price: '-0.01' }, '23514'],
      [{ price: '10000000000.00' }, '22003'], [{ price: 'NaN' }, '23514'],
      [{ price: null }, '23502'], [{ title: '   ' }, '23514'],
      [{ category: '' }, '23514'], [{ image: '' }, '23514'],
      [{ description: null }, '23502'], [{ ratingRate: -0.1 }, '23514'],
      [{ ratingRate: 5.1 }, '23514'], [{ ratingRate: NaN }, '23514'],
      [{ ratingCount: -1 }, '23514'], [{ ratingCount: 2147483648 }, '22003'],
    ];
    for (const [override, code] of invalid) {
      await runner.query('SAVEPOINT invalid_product');
      await assert.rejects(repository.insert({ ...product, id: 2, ...override }), { code });
      await runner.query('ROLLBACK TO SAVEPOINT invalid_product');
    }
  } finally {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
    await source.destroy();
  }
});
