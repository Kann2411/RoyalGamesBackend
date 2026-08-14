import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

dotenvConfig({ path: '.env' });

const config = {
  type: 'postgres',
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  autoLoadEntities: true,
  dropSchema: false,
  synchronize: false,
  logging: false,
  ssl:
    (process.env.DB_SSL || 'false').toLowerCase() === 'true'
      ? { rejectUnauthorized: false }
      : false,
  // Safety net: a stuck query or a transaction left open by a bug must never be able to hang
  // forever and starve the connection pool for the whole app - it should error out instead.
  extra: {
    max: 10,
    statement_timeout: 15000,
    query_timeout: 15000,
    idle_in_transaction_session_timeout: 20000,
  },
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  migrations: [__dirname + '/../migrations/**/*.{js,ts}'],
};

export default registerAs('typeorm', () => config);
export const connectionSource = new DataSource(config as DataSourceOptions);
