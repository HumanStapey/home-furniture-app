const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Logger } = require('@nestjs/common');
const { ProductsSeedRunner } = require('../dist/products/products-seed.runner');

const flush = () => new Promise(resolve => setImmediate(resolve));

test('starts without awaiting import, retries after failure and stops after success', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(Logger.prototype, 'warn', () => {});
  t.mock.method(Logger.prototype, 'log', () => {});
  let attempts = 0;
  const runner = new ProductsSeedRunner({ import: async () => {
    attempts++;
    if (attempts === 1) throw new Error('Fake Store unavailable');
    return 2;
  } });
  try {
    assert.equal(runner.onApplicationBootstrap(), undefined);
    await flush();
    assert.equal(attempts, 1);
    t.mock.timers.tick(59_999);
    await flush();
    assert.equal(attempts, 1);
    t.mock.timers.tick(1);
    await flush();
    assert.equal(attempts, 2);
    t.mock.timers.tick(120_000);
    await flush();
    assert.equal(attempts, 2);
  } finally {
    await runner.beforeApplicationShutdown();
  }
});

test('cancels an in-flight import at shutdown and does not overlap attempts', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let attempts = 0;
  let cancelled = false;
  const runner = new ProductsSeedRunner({ import: signal => {
    attempts++;
    return new Promise((resolve, reject) => signal.addEventListener('abort', () => {
      cancelled = true;
      reject(signal.reason);
    }, { once: true }));
  } });
  runner.onApplicationBootstrap();
  t.mock.timers.tick(120_000);
  await flush();
  assert.equal(attempts, 1);
  await runner.beforeApplicationShutdown();
  assert.equal(cancelled, true);
  t.mock.timers.tick(120_000);
  await flush();
  assert.equal(attempts, 1);
});

test('clears a scheduled retry when the application shuts down', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(Logger.prototype, 'warn', () => {});
  let attempts = 0;
  const runner = new ProductsSeedRunner({ import: async () => {
    attempts++;
    throw new Error('Unavailable');
  } });
  runner.onApplicationBootstrap();
  await flush();
  await runner.beforeApplicationShutdown();
  t.mock.timers.tick(60_000);
  await flush();
  assert.equal(attempts, 1);
});
