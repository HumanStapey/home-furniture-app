const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { resolve } = require('node:path');
const { test } = require('node:test');
const { setTimeout: delay } = require('node:timers/promises');

const docker = (...args) => execFileSync('docker', args, {
  cwd: resolve(__dirname, '..'), encoding: 'utf8', timeout: 20_000,
}).trim();

async function until(check, timeout, message) {
  const deadline = Date.now() + timeout;
  do {
    if (check()) return;
    await delay(200);
  } while (Date.now() < deadline);
  assert.fail(message);
}

test('Nginx recovers promptly when the backend appears after a DNS failure', async t => {
  const frontendImage = docker('compose', 'images', '--quiet', 'frontend');
  const backendImage = docker('compose', 'images', '--quiet', 'backend');
  assert.ok(frontendImage && backendImage, 'Build the Compose images before running this test');
  const network = `furniture-dns-test-${randomUUID()}`;
  const containers = [];
  docker('network', 'create', network);
  t.after(() => {
    for (const container of containers.reverse()) docker('rm', '--force', container);
    docker('network', 'rm', network);
  });

  const proxy = docker('run', '--detach', '--network', network, '--mount',
    `type=bind,source=${resolve(__dirname, '../frontend/nginx.conf')},target=/etc/nginx/conf.d/default.conf,readonly`,
    frontendImage);
  containers.push(proxy);
  await until(() => {
    const logs = spawnSync('docker', ['logs', proxy], { encoding: 'utf8', timeout: 3000 });
    return /backend could not be resolved/.test(logs.stdout + logs.stderr);
  }, 15_000,
    'The test must observe a failed DNS lookup before starting the backend');

  const backend = docker('run', '--detach', '--network', network, '--network-alias', 'backend',
    '--entrypoint', 'node', backendImage, '-e',
    "require('node:http').createServer((request, response) => response.end(request.url)).listen(3001, '0.0.0.0')");
  containers.push(backend);
  await until(() => spawnSync('docker', ['exec', backend, 'node', '-e',
    "fetch('http://127.0.0.1:3001/api').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"],
    { timeout: 3000 }).status === 0, 5000, 'The test backend must be ready');

  const started = Date.now();
  await until(() => spawnSync('docker', ['exec', proxy, 'wget', '-q', '-T', '1', '-O', '-',
    'http://127.0.0.1/api/products?limit=1'], { encoding: 'utf8', timeout: 3000 }).stdout?.trim()
      === '/api/products?limit=1', 5000,
    'The API proxy must recover within five seconds of the backend becoming ready');
  t.diagnostic(`API proxy recovered in ${Date.now() - started} ms`);
  assert.equal(docker('exec', proxy, 'wget', '-q', '-O', '-',
    'http://127.0.0.1/api/products/categories'), '/api/products/categories');
});
