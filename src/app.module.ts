import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import typeOrmConfig from './config/typeorm.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GamesModule } from './modules/games/games.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ChipsModule } from './modules/chips/chips.module';
import { MailingModule } from './modules/mailing/mailing.module';
import { BingoModule } from './modules/bingo/bingo.module';
import { FriendsModule } from './modules/friends/friends.module';
import { MessagesModule } from './modules/messages/messages.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [typeOrmConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const typeormConfig = configService.get('typeorm');
        if (!typeormConfig) {
          throw new Error('TypeORM configuration is not defined');
        }
        return typeormConfig;
      },
    }),
    AuthModule,
    UsersModule,
    GamesModule,
    PaymentsModule,
    ChipsModule,
    MailingModule,
    BingoModule,
    FriendsModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
