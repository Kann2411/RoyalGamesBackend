import * as dotenv from 'dotenv';
// Load .env as early as possible so it's available to any imported modules
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import morgan from 'morgan';
import cors from 'cors';
import MercadoPagoConfig from 'mercadopago';
import { AppModule } from './app.module';

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
  
  // Log environment info
  console.log('Environment Info:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`PORT: ${process.env.PORT || 3001}`);
  console.log(`DB_HOST: ${process.env.DB_HOST || 'not set'}`);
  console.log(`DB_NAME: ${process.env.DB_NAME || 'not set'}`);
  console.log(`DATABASE_URL configured: ${!!process.env.DATABASE_URL}`);
  console.log(`JWT_SECRET configured: ${!!process.env.JWT_SECRET}`);
  
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // MercadoPago Configuration
  try {
    const mercadoPagoClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    });
    console.log('✅ MercadoPago configured');
  } catch (error) {
    console.warn('⚠️ MercadoPago configuration warning:', error.message);
  }

  // Middleware
  app.use(morgan('dev'));
  
  // Enhanced CORS Configuration
  app.enableCors({
    origin: [
      'https://royal-front-new.vercel.app',
      'http://localhost:5173',
      'https://html-classic.itch.zone',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 200,
  });

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

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`\n✅ 🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`);
  console.log(`❤️  Health check at http://localhost:${port}/health\n`);
}

bootstrap().catch((error) => {
  console.error('\n❌ Failed to start application:');
  console.error('Error type:', error.constructor.name);
  console.error('Error message:', error.message);
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
  console.error('\nDebug info:');
  console.error('DATABASE_URL set:', !!process.env.DATABASE_URL);
  console.error('JWT_SECRET set:', !!process.env.JWT_SECRET);
  console.error('NODE_ENV:', process.env.NODE_ENV);
  process.exit(1);
});
