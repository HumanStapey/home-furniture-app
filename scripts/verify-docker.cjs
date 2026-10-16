const assert = require('node:assert/strict');
const { test } = require('node:test');

const origin = process.env.DOCKER_BASE_URL || 'http://localhost:8080';
const request = (path) => fetch(new URL(path, origin), { signal: AbortSignal.timeout(10_000) });

test('Nginx serves the SPA and its assets on direct application routes', async () => {
  const root = await request('/');
  assert.equal(root.status, 200);
  const html = await root.text();
  assert.match(root.headers.get('content-type'), /text\/html/);
  for (const path of ['/products', '/product/123456789', '/cart']) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /text\/html/, path);
    assert.match(await response.text(), /<html/, path);
  }
  const asset = html.match(/src="([^"]*\/_next\/[^"]+\.js)"/);
  assert.ok(asset, 'Exported HTML references a JavaScript asset');
  const response = await request(asset[1]);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /javascript/);
  assert.equal((await request('/_next/missing.js')).status, 404);
});

test('Nginx preserves API responses and validation errors', async () => {
  const response = await request('/api');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { name: 'Home Furniture API' });
  for (const [path, status] of [['/api/products?page=0', 400], ['/api/not-a-route', 404]]) {
    const error = await request(path);
    assert.equal(error.status, status, path);
    assert.match(error.headers.get('content-type'), /application\/json/, path);
    assert.equal((await error.json()).statusCode, status, path);
  }
});
