import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeormTestingConfig = (): TypeOrmModuleOptions => ({
  type: 'sqlite',
  database: ':memory:',
  entities: ['src/modules/**/entities/*.entity.ts'],
  synchronize: true,
  dropSchema: true,
});
