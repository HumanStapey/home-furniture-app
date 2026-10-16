import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadDatabaseOptions } from './database.config';

export default new DataSource(loadDatabaseOptions());
