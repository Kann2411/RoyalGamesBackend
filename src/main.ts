import * as dotenv from 'dotenv';
// Load .env as early as possible so it's available to any imported modules
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';
import morgan from 'morgan';
import cors from 'cors';
import MercadoPagoConfig from 'mercadopago';
import { DataSource } from 'typeorm';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import { ALLOWED_ORIGINS } from './config/cors-origins';

async function bootstrap() {
  // Validate critical environment variables early to provide clear errors
  const validateEnv = () => {
    // In local/dev, most DB settings have sensible defaults.
    // Only require JWT_SECRET to start the app; others are optional.
    const required = ['JWT_SECRET'];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
      console.error('Missing required environment variables:', missing.join(', '));
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  };

  validateEnv();
  const app = await NestFactory.create(AppModule);

  const dataSource = app.get(DataSource);
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  try {
    await dataSource.runMigrations();
    console.log('Database migrations applied successfully');
  } catch (migrationError) {
    console.warn('Migrations failed, attempting schema sync:', migrationError);
    try {
      await dataSource.synchronize();
      console.log('Database schema synchronized successfully');
    } catch (syncError) {
      console.error('Failed to synchronize database schema:', syncError);
    }
  }

  // MercadoPago Configuration
  const mercadoPagoClient = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  });

  // Middleware
  app.use(morgan('dev'));
  app.use(
    cors({
      origin: ALLOWED_ORIGINS,
      credentials: true,
    }),
  );

  // WebSocket adapter (native `ws`, used by BingoGateway at /bingo/ws)
  app.useWebSocketAdapter(new WsAdapter(app));

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Royal Games API')
    .setDescription('Scalable NestJS Backend for Gaming Platform')
    .setVersion('2.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Games', 'Games management and favorites')
    .addTag('Payments', 'Payment processing (MercadoPago, PayPal)')
    .addTag('Chips', 'Chips management')
    .addTag('Mailing', 'Email services')
    .build();

  let document: OpenAPIObject;
  try {
    document = SwaggerModule.createDocument(app, config);
  } catch (swaggerError) {
    console.warn('Swagger schema generation failed, continuing without docs:', swaggerError);
    document = {
      openapi: '3.0.0',
      info: { title: 'Royal Games API', version: '2.0.0' },
      paths: {},
      components: {},
    } as OpenAPIObject;
  }

  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
