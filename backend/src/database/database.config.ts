import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import type { DataSourceOptions } from 'typeorm';
import { ProductEntity } from '../products/product.entity';

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function getDatabaseOptions(environment: NodeJS.ProcessEnv): DataSourceOptions {
  const host = required(environment, 'DB_HOST');
  const portValue = required(environment, 'DB_PORT');
  const port = Number(portValue);

  if (!/^\d+$/.test(portValue) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535.');
  }

  return {
    type: 'postgres',
    host,
    port,
    database: required(environment, 'DB_NAME'),
    username: required(environment, 'DB_USER'),
    password: required(environment, 'DB_PASSWORD'),
    connectTimeoutMS: 5000,
    entities: [ProductEntity],
    synchronize: false,
    migrationsRun: false,
  };
}

export function loadDatabaseOptions(): DataSourceOptions {
  const envPath = resolve(__dirname, '../../../.env');
  if (existsSync(envPath)) {
    loadEnvFile(envPath);
  }
  return getDatabaseOptions(process.env);
}
