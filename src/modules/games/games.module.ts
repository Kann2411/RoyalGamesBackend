import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './entities/game.entity';
import { User } from '../users/entities/user.entity';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { GamesRepository } from './repositories/games.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Game, User])],
  controllers: [GamesController],
  providers: [GamesService, GamesRepository],
  exports: [GamesService, GamesRepository],
})
export class GamesModule {}
