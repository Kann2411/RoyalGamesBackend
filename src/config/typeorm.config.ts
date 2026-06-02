import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';

export const typeormConfig = (): TypeOrmModuleOptions => {
  const isCompiled = path.extname(__filename) === '.js';
  const ext = isCompiled ? '.js' : '.ts';
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Prefer explicit DB_SSL env var. If DB_SSL is not set, default to false for local development.
  const dbSslEnv = (process.env.DB_SSL || (nodeEnv === 'production' ? 'true' : 'false')).toLowerCase();
  const useSsl = dbSslEnv === 'true';

  const config: TypeOrmModuleOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'rgames',
    entities: [path.join(__dirname, `../modules/**/entities/*.entity${ext}`)],
    migrations: [path.join(__dirname, `../migrations/*${ext}`)],
    synchronize: nodeEnv !== 'production',
    dropSchema: false,
    logging: nodeEnv === 'development',
    // Use explicit DB_SSL flag to avoid attempting SSL against servers that don't support it
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    url: process.env.DATABASE_URL,
    connectTimeoutMS: 10000,
    extra: {
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  };

  console.log('TypeORM Config:');
  console.log(`- Environment: ${nodeEnv}`);
  console.log(`- Using DATABASE_URL: ${!!process.env.DATABASE_URL}`);
  console.log(`- SSL enabled: ${useSsl}`);
  console.log(`- Synchronize: ${config.synchronize}`);
  console.log(`- Logging: ${config.logging}`);

  return config;
};
