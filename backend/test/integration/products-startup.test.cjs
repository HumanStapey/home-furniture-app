const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../../dist/app.module');
const { configureApp } = require('../../dist/configure-app');

test('serves the API while startup import is pending and cancels it before closing', async t => {
  const realFetch = globalThis.fetch;
  let importSignal;
  t.mock.method(globalThis, 'fetch', (url, { signal }) => {
    importSignal = signal;
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
  });
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  try {
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    assert.equal(importSignal.aborted, false);
    const response = await realFetch(`${await app.getUrl()}/api`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { name: 'Home Furniture API' });
  } finally {
    await app.close();
  }
  assert.equal(importSignal.aborted, true);
});
