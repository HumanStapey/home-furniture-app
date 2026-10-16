const assert = require('node:assert/strict');
const { test } = require('node:test');
const { parseProducts } = require('../dist/products/fake-store-product.dto');
const { ProductsImportService } = require('../dist/products/products-import.service');

const product = {
  id: 1, title: 'Chair', price: 109.95, description: 'A comfortable chair',
  category: 'furniture', image: 'https://example.com/chair.png', rating: { rate: 3.9, count: 120 },
};

test('validates and maps the source without coercing types or losing cents', () => {
  const [mapped] = parseProducts([{ ...product, ignored: true }]);
  assert.deepEqual({ ...mapped }, {
    id: 1, title: 'Chair', price: '109.95', description: 'A comfortable chair',
    category: 'furniture', image: 'https://example.com/chair.png', ratingRate: 3.9, ratingCount: 120,
  });
  for (const [price, expected] of [[0, '0.00'], [0.1, '0.10'], [9999999999.99, '9999999999.99']]) {
    assert.equal(parseProducts([{ ...product, price }])[0].price, expected);
  }
});

test('rejects an entire invalid, empty or duplicate batch before persistence', () => {
  const invalid = [
    null, {}, [], [null], [[product]], [product, product],
    ...[
      { id: 0 }, { id: 1.5 }, { id: 2147483648 }, { id: '1' },
      { title: ' \t ' }, { category: '' }, { description: null },
      { image: 'javascript:alert(1)' }, { image: '/chair.png' },
      { price: -0.01 }, { price: 1.001 }, { price: 1e-7 }, { price: '1.00' },
      { price: NaN }, { price: Infinity }, { price: 10000000000 },
      { rating: null }, { rating: [] }, { rating: {} },
      { rating: { rate: 5.1, count: 0 } }, { rating: { rate: -1, count: 0 } },
      { rating: { rate: 4, count: -1 } }, { rating: { rate: 4, count: 1.5 } },
      { rating: { rate: 4, count: 2147483648 } }, { rating: { rate: '4', count: 0 } },
    ].map(override => [{ ...product, ...override }]),
  ];
  for (const payload of invalid) assert.throws(() => parseProducts(payload), /Fake Store/);
});

test('rejects HTTP, JSON, transport and validation failures without writing', async t => {
  const importer = new ProductsImportService({ importBatch: async () => assert.fail('invalid response reached persistence') });
  for (const response of [new Response('down', { status: 503 }), new Response('{'), Response.json([])]) {
    t.mock.method(globalThis, 'fetch', async () => response);
    await assert.rejects(importer.import(), /Fake Store/);
    t.mock.restoreAll();
  }
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('network failed'); });
  await assert.rejects(importer.import(), /Fake Store/);
});

test('aborts a stalled request after ten seconds without writing', { timeout: 15_000 }, async t => {
  // AbortSignal.timeout does not keep the event loop alive.
  const keepAlive = setTimeout(() => {}, 15_000);
  t.after(() => clearTimeout(keepAlive));
  t.mock.method(globalThis, 'fetch', (_url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  let writes = 0;
  const importer = new ProductsImportService({ importBatch: async () => { writes++; } });
  const started = performance.now();
  await assert.rejects(importer.import(), /timeout/);
  assert.ok(performance.now() - started >= 9_900, 'request aborted before the ten-second deadline');
  assert.equal(writes, 0);
});

test('imports a validated batch and passes cancellation to the HTTP request', async t => {
  let received;
  let requestSignal;
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://fakestoreapi.com/products');
    requestSignal = options.signal;
    return Response.json([product]);
  });
  const importer = new ProductsImportService({ importBatch: async products => { received = products; } });
  assert.equal(await importer.import(controller.signal), 1);
  assert.equal(received[0].price, '109.95');
  controller.abort();
  assert.equal(requestSignal.aborted, true);
});
