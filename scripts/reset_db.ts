import { config } from 'dotenv';
config({ path: '.env' });

import { Client } from 'pg';
import { connectionSource } from '../src/config/typeorm.config';

async function resetSchema() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
  });

  await client.connect();
  console.log('Connected to Postgres. Resetting public schema...');

  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  console.log('Schema public reset.');

  await client.end();
}

async function runMigrations() {
  await connectionSource.initialize();
  console.log('TypeORM data source initialized. Running migrations...');
  await connectionSource.runMigrations();
  console.log('Migrations completed.');
  await connectionSource.destroy();
}

async function main() {
  try {
    await resetSchema();
    await runMigrations();
    console.log('Database reset and migrations applied successfully.');
  } catch (error) {
    console.error('Database reset failed:', error);
    process.exit(1);
  }
}

main();
