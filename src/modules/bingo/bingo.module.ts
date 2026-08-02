import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BingoController } from './bingo.controller';
import { BingoService } from './bingo.service';
import { BingoPlayer } from './entities/bingo-player.entity';
import { BingoRoom } from './entities/bingo-room.entity';
import { BingoGame } from './entities/bingo-game.entity';
import { BingoSuperBingoPool } from './entities/bingo-super-bingo-pool.entity';
import { BingoCard } from './entities/bingo-card.entity';
import { BingoTicket } from './entities/bingo-ticket.entity';
import { BingoRound } from './entities/bingo-round.entity';
import { BingoWinner } from './entities/bingo-winner.entity';
import { BingoAudit } from './entities/bingo-audit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BingoPlayer,
      BingoRoom,
      BingoGame,
      BingoSuperBingoPool,
      BingoCard,
      BingoTicket,
      BingoRound,
      BingoWinner,
      BingoAudit,
    ]),
  ],
  controllers: [BingoController],
  providers: [BingoService],
  exports: [BingoService],
})
export class BingoModule {}
