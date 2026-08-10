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
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

@Injectable()
export class BingoEngineService implements OnModuleInit {
  private readonly logger = new Logger(BingoEngineService.name);
  private interval: NodeJS.Timeout;
  private locked = false;
  private static readonly ROOM_TICK_TIMEOUT_MS = 12000;

  constructor(
    private readonly bingoService: BingoService,
    private readonly gateway: BingoGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bingoService.ensureDefaultRooms();

    // Emergency kill switch: if the engine ever needs to be stopped in production without a
    // redeploy (e.g. while diagnosing a DB issue), set BINGO_ENGINE_ENABLED=false in Render's
    // environment variables and restart the service. Rooms simply stop advancing; nothing else
    // in the app (users, chips, other games) depends on this loop.
    if ((process.env.BINGO_ENGINE_ENABLED ?? 'true').toLowerCase() === 'false') {
      this.logger.warn('BingoEngineService disabled via BINGO_ENGINE_ENABLED=false - rooms will not advance.');
      return;
    }

    this.interval = setInterval(() => {
      this.tick().catch((err) => this.logger.error(`Engine tick failed: ${err.message}`));
    }, 3000);
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
        // Deliberately NOT gated on "is anyone connected right now": that used an in-memory
        // connection count that can desync from reality (a room with real purchases and an
        // expired countdown got silently skipped forever). A handful of cheap SELECTs per room
        // every 3s is fine - `processRoom` itself already no-ops immediately for rooms with no
        // purchase in progress, so idle rooms cost almost nothing anyway.
        try {
          await withTimeout(
            this.processRoom(room.id, now),
            BingoEngineService.ROOM_TICK_TIMEOUT_MS,
            `Room ${room.id} tick`,
          );
        } catch (roomError) {
          this.logger.warn(`Room ${room.id} tick error: ${(roomError as Error).message}`);
        }
      }
    } finally {
      this.locked = false;
    }
  }

  private async processRoom(roomId: string, now: Date): Promise<void> {
    const game = await this.bingoService.getRoomCurrentGame(roomId);

    if (game.state === BingoGameState.WAITING) {
      const purchaseStartedAt = game.persistedSnapshot?.purchaseStartedAt ?? null;
      const remaining = getPurchaseWindowRemaining(purchaseStartedAt, this.bingoService.purchaseWindowSeconds, now);
      if (remaining === 0) {
        const started = await this.bingoService.startGame(game.id);
        if (started.state === BingoGameState.RUNNING) {
          await this.gateway.broadcastGameStarted(roomId, started.id);
        }
      }
      return;
    }

    if (game.state === BingoGameState.RUNNING) {
      const progress = deriveGameProgress(game, now);
      if (progress.isFinished) {
        const result = await this.bingoService.finishGameAutomatically(game.id);
        const pool = await this.bingoService.getOrCreateSuperbingoForRoom(roomId);
        await this.gateway.broadcastGameFinished(roomId, {
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
        await this.gateway.ensureTimerIfRoomOccupied(roomId, result.nextGame.id);
        await this.gateway.broadcastRoomState(roomId);
      }
    }
  }
}
