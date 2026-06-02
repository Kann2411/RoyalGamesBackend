import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config as dotenvConfig } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

dotenvConfig({ path: '.env' });

const config = {
  type: 'postgres' as const,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/../modules/**/entities/*.entity.{js,ts}'],
  migrations: [__dirname + '/../migrations/**/*.{js,ts}'],
  autoLoadEntities: true,
  dropSchema: false,
  synchronize: process.env.NODE_ENV !== 'production',
} as TypeOrmModuleOptions;

export const typeormConfig = (): TypeOrmModuleOptions => config;
export const connectionSource = new DataSource(config as DataSourceOptions);
