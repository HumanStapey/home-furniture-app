const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { TypeOrmModule } = require('@nestjs/typeorm');
const { DataSource, MigrationExecutor } = require('typeorm');
const { loadDatabaseOptions } = require('../../dist/database/database.config');
const { ProductEntity } = require('../../dist/products/product.entity');
const { parseProducts } = require('../../dist/products/fake-store-product.dto');
const { ProductsRepository } = require('../../dist/products/products.repository');
const { ProductsModule } = require('../../dist/products/products.module');
const { configureApp } = require('../../dist/configure-app');

test('catalogue HTTP contract uses local data, validates inputs and handles unavailable data', async t => {
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  const options = { ...loadDatabaseOptions(), schema };
  const source = await new DataSource(options).initialize();
  const runner = source.createQueryRunner();
  const realFetch = globalThis.fetch;
  let upstreamCalls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    upstreamCalls++;
    return new Response('unavailable', { status: 503 });
  });
  let app;
  try {
    await runner.startTransaction();
    await runner.createSchema(schema);
    await runner.query(`SET LOCAL search_path TO "${schema}"`);
    await new MigrationExecutor(source, runner).executePendingMigrations();
    await runner.commitTransaction();
    class ApiTestModule {}
    Module({ imports: [TypeOrmModule.forRoot(options), ProductsModule] })(ApiTestModule);
    app = await NestFactory.create(ApiTestModule, { logger: false, abortOnError: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const get = async path => {
      const response = await realFetch(`${base}/api${path}`);
      return { status: response.status, body: await response.json() };
    };
    for (const path of ['/products', '/products/categories', '/products/1']) {
      const result = await get(path);
      assert.equal(result.status, 503);
      assert.equal(result.body.statusCode, 503);
      assert.equal(result.body.error, 'Service Unavailable');
    }
    const repository = source.getRepository(ProductEntity);
    await repository.insert([
      { id: 1, title: 'Oak chair', price: '109.95', category: 'living', description: 'Solid wood' },
      { id: 2, title: 'Desk lamp', price: '9.90', category: 'lighting', description: 'For reading' },
      { id: 3, title: '100% lamp', price: '9.90', category: 'lighting', description: 'Oak finish' },
      { id: 4, title: 'Sofa', price: '250.00', category: 'living', description: 'Fabric' },
    ].map(product => ({ ...product, image: 'https://example.com/item.png', ratingRate: 3.9, ratingCount: 120 })));

    const list = await get('/products');
    assert.equal(list.status, 200);
    assert.deepEqual({ ...list.body, items: list.body.items.map(item => item.id) }, {
      items: [1, 2, 3, 4], total: 4, page: 1, limit: 12, totalPages: 1,
    });
    assert.deepEqual(list.body.items[0], {
      id: 1, title: 'Oak chair', price: 109.95, category: 'living', description: 'Solid wood',
      image: 'https://example.com/item.png', rating: { rate: 3.9, count: 120 },
    });
    const page = await get('/products?sort=price&order=asc&limit=1&page=2');
    assert.deepEqual({ ...page.body, items: page.body.items.map(item => item.id) }, {
      items: [3], total: 4, page: 2, limit: 1, totalPages: 4,
    });
    assert.deepEqual((await get('/products?sort=price&order=desc')).body.items.map(item => item.id), [4, 1, 2, 3]);
    assert.deepEqual((await get('/products?sort=title')).body.items.map(item => item.id), [3, 2, 1, 4]);
    assert.deepEqual((await get('/products?search=OAK&category=lighting')).body.items.map(item => item.id), [3]);
    assert.deepEqual((await get('/products?search=%25')).body.items.map(item => item.id), [3]);
    assert.equal((await get('/products?search=missing')).body.totalPages, 0);
    assert.deepEqual({ ...(await get('/products?page=100')).body }, {
      items: [], total: 4, page: 100, limit: 12, totalPages: 1,
    });
    assert.deepEqual((await get('/products/categories')).body, ['lighting', 'living']);
    assert.deepEqual((await get('/products/1')).body, list.body.items[0]);
    for (const query of ['search=missing', 'search=_', 'category=missing', 'page=100', `category=${encodeURIComponent("x' OR 1=1 --")}`]) {
      const result = await get(`/products?${query}`);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body.items, []);
    }
    for (const query of [
      'page=0', 'page=-1', 'page=1.5', 'page=1e2', 'page=0x10', 'page=',
      'page=2147483648', 'limit=101', 'limit=0', 'limit=1&limit=2',
      'sort=description', 'order=DESC', 'unknown=true', `search=${'a'.repeat(201)}`,
      'search=%00', 'category=%00', 'search=chair%00wood', 'category=living%00room',
    ]) {
      const result = await get(`/products?${query}`);
      assert.equal(result.status, 400, query);
      assert.equal(result.body.error, 'Bad Request');
      assert.ok(Array.isArray(result.body.message));
    }
    for (const id of ['0', '-1', 'abc', '1.5', '2147483648']) {
      assert.equal((await get(`/products/${id}`)).status, 400);
    }
    assert.equal((await get('/products/99')).status, 404);
    assert.equal((await get('/unknown')).body.error, 'Not Found');
    const spec = await get('/docs-json');
    assert.equal(spec.status, 200);
    for (const path of ['/api/products', '/api/products/categories', '/api/products/{id}']) {
      assert.ok(spec.body.paths[path].get);
    }
    const parameters = spec.body.paths['/api/products'].get.parameters;
    assert.deepEqual(parameters.map(parameter => parameter.name).sort(), ['category', 'limit', 'order', 'page', 'search', 'sort']);
    assert.equal(parameters.find(parameter => parameter.name === 'limit').schema.maximum, 100);
    assert.equal(spec.body.components.schemas.ProductResponseDto.properties.price.type, 'number');
    assert.ok(spec.body.components.schemas.ProductsResponseDto.properties.items.items.$ref);
    assert.equal((await realFetch(`${base}/api/docs/`)).status, 200);
    assert.equal(upstreamCalls, 1, 'catalogue reads must not fetch Fake Store');
    const longCategory = 'a'.repeat(201);
    await new ProductsRepository(source).importBatch(parseProducts([
      { ...list.body.items[0], id: 5, category: longCategory },
    ]));
    assert.ok((await get('/products/categories')).body.includes(longCategory));
    const filtered = await get(`/products?category=${encodeURIComponent(longCategory)}`);
    assert.equal(filtered.status, 200);
    assert.deepEqual(filtered.body.items.map(product => product.id), [5]);
    assert.equal(filtered.body.items[0].category, longCategory);
    await app.get(DataSource).destroy();
    assert.deepEqual(await get('/products'), {
      status: 500,
      body: { statusCode: 500, message: 'Internal server error', error: 'Internal Server Error' },
    });
  } finally {
    if (app) await app.close();
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await source.destroy();
  }
});
