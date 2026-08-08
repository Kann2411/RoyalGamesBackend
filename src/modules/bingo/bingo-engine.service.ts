import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BingoService } from './bingo.service';
import { BingoGateway } from './bingo.gateway';
import { BingoGameState } from './entities/bingo-game.entity';
import { BingoWinner } from './entities/bingo-winner.entity';
import { deriveGameProgress, getPurchaseWindowRemaining } from './bingo-time.util';

/**
 * Owns the room ticker. Unlike the old engine, this no longer draws one ball per second into the
 * DB — the whole draw is precomputed once in `BingoService.startGame`. All this loop does is
 * notice the two state transitions (waiting -> running, running -> finished) and broadcast them;
 * "where the game is right now" is always derived from time, not from how often this tick fires.
 */
@Injectable()
export class BingoEngineService implements OnModuleInit {
  private readonly logger = new Logger(BingoEngineService.name);
  private interval: NodeJS.Timeout;
  private locked = false;

  constructor(
    private readonly bingoService: BingoService,
    private readonly gateway: BingoGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bingoService.ensureDefaultRooms();
    this.interval = setInterval(() => {
      this.tick().catch((err) => this.logger.error(`Engine tick failed: ${err.message}`));
    }, 2000);
  }

  private async tick(): Promise<void> {
    if (this.locked) {
      return;
    }
    this.locked = true;
    try {
      const rooms = await this.bingoService.getRooms();
      const now = new Date();

      for (const room of rooms) {
        try {
          const game = await this.bingoService.getRoomCurrentGame(room.id);

          if (game.state === BingoGameState.WAITING) {
            const purchaseStartedAt = game.persistedSnapshot?.purchaseStartedAt ?? null;
            const remaining = getPurchaseWindowRemaining(purchaseStartedAt, this.bingoService.purchaseWindowSeconds, now);
            if (remaining === 0) {
              const started = await this.bingoService.startGame(game.id);
              if (started.state === BingoGameState.RUNNING) {
                await this.gateway.broadcastGameStarted(room.id, started.id);
              }
            }
            continue;
          }

          if (game.state === BingoGameState.RUNNING) {
            const progress = deriveGameProgress(game, now);
            if (progress.isFinished) {
              const result = await this.bingoService.finishGameAutomatically(game.id);
              const pool = await this.bingoService.getOrCreateSuperbingoForRoom(room.id);
              await this.gateway.broadcastGameFinished(room.id, {
                gameId: game.id,
                resultSummary: result.game.resultSummary ?? {},
                winners: result.winners.map((w: BingoWinner) => ({
                  playerId: w.playerId,
                  cardId: w.cardId,
                  winType: w.winType,
                  prizeAmount: Number(w.prizeAmount),
                  roundNumber: w.roundNumber,
                })),
                superbingo: {
                  poolAmount: Number(pool.amount),
                  thresholdBall: pool.thresholdBall,
                },
                nextGameId: result.nextGame.id,
              });
              await this.gateway.broadcastRoomState(room.id);
            }
          }
        } catch (roomError) {
          this.logger.warn(`Room ${room.id} tick error: ${(roomError as Error).message}`);
        }
      }
    } finally {
      this.locked = false;
    }
  }
}
