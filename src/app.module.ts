import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeormConfig } from './config/typeorm.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GamesModule } from './modules/games/games.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ChipsModule } from './modules/chips/chips.module';
import { MailingModule } from './modules/mailing/mailing.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(typeormConfig()),
    AuthModule,
    UsersModule,
    GamesModule,
    PaymentsModule,
    ChipsModule,
    MailingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
