import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';

// DataSource untuk image produksi: hanya ada hasil build (dist/*.js), tanpa
// ts-node dan tanpa typeorm CLI. data-source.ts tetap untuk dev.
export const ProdDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'postgres',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [join(__dirname, '..', '**', '*.entity.js')],
  migrations: [join(__dirname, 'migrations', '*.js')],
  synchronize: false,
});
