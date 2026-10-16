const assert = require('node:assert/strict');
const { test } = require('node:test');
const { getDatabaseOptions } = require('../dist/database/database.config');

const environment = {
  DB_HOST: 'localhost',
  DB_PORT: '15432',
  DB_NAME: 'home_furniture',
  DB_USER: 'home_furniture',
  DB_PASSWORD: 'test-password',
};

test('reads PostgreSQL connection settings without enabling schema changes', () => {
  const options = getDatabaseOptions(environment);

  assert.equal(options.type, 'postgres');
  assert.equal(options.host, 'localhost');
  assert.equal(options.port, 15432);
  assert.equal(options.database, 'home_furniture');
  assert.equal(options.username, 'home_furniture');
  assert.equal(options.password, 'test-password');
  assert.equal(options.synchronize, false);
  assert.equal(options.migrationsRun, false);
});

for (const name of Object.keys(environment)) {
  test(`rejects missing or blank ${name} without exposing credentials`, () => {
    for (const value of [undefined, '', '   ']) {
      assert.throws(
        () => getDatabaseOptions({ ...environment, [name]: value }),
        (error) => error.message.includes(name) && !error.message.includes(environment.DB_PASSWORD),
      );
    }
  });
}

test('rejects ports outside the valid integer range or in an unexpected format', () => {
  for (const port of ['0', '65536', '-1', '5432.5', 'abc', '0x1538', '1e4', ' 5432 ']) {
    assert.throws(() => getDatabaseOptions({ ...environment, DB_PORT: port }), /DB_PORT/);
  }
});

test('accepts both boundaries of the valid port range', () => {
  assert.equal(getDatabaseOptions({ ...environment, DB_PORT: '1' }).port, 1);
  assert.equal(getDatabaseOptions({ ...environment, DB_PORT: '65535' }).port, 65535);
});

test('preserves whitespace inside a nonempty password', () => {
  const password = '  test-password  ';
  assert.equal(getDatabaseOptions({ ...environment, DB_PASSWORD: password }).password, password);
});
