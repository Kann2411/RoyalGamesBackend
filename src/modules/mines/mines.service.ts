import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { randomBytes, randomInt, createHash } from 'crypto';
import { MinesRound } from './entities/mines-round.entity';
import { User } from '../users/entities/user.entity';
import { ChipsAward } from '../chips/entities/chips-award.entity';
import { StartRoundDto } from './dtos/start-round.dto';
import { RevealTileDto } from './dtos/reveal-tile.dto';
import { CashoutDto } from './dtos/cashout.dto';
import { MINES_TILE_COUNT } from './constants/fixed-bet-values';
import { BingoService } from '../bingo/bingo.service';
import { BingoGateway } from '../bingo/bingo.gateway';

// Postgres unique_violation, thrown by the partial unique index on (userId) WHERE
// status = 'active' when two concurrent `start` calls race past the pre-check below.
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class MinesService {
  private readonly logger = new Logger(MinesService.name);

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private bingoService: BingoService,
    private bingoGateway: BingoGateway,
  ) {}

  /**
   * Chips only change here on start (debit) and cashout (credit) - the Minas chat panel's player
   * list (PresenceEntry.chips, see bingo.gateway.ts buildPresence) is a snapshot the gateway only
   * refreshes on its own WS events, so without this a player's displayed chip count would go
   * stale the moment they play. Best-effort: never let a chat-refresh hiccup fail the actual
   * money-moving request, which has already succeeded by the time this runs.
   */
  private async refreshMinasChatPresence(): Promise<void> {
    try {
      const room = await this.bingoService.ensureLobbyRoom('minas', 'Minas');
      await this.bingoGateway.broadcastRoomState(room.id);
    } catch (err: any) {
      this.logger.warn(`Could not refresh Minas chat presence: ${err?.message}`);
    }
  }

  async startRound(userId: string, dto: StartRoundDto) {
    const { betAmount, minesCount } = dto;

    const existingActive = await this.dataSource.manager.findOne(MinesRound, {
      where: { userId, status: 'active' },
    });
    if (existingActive) {
      throw new ConflictException('You already have an active Mines round');
    }

    const minePositions = this.generateMinePositions(minesCount);
    const serverSeed = randomBytes(32).toString('hex');
    const serverSeedHash = createHash('sha256').update(serverSeed).digest('hex');
    const multiplierBp = this.baseMultiplierBp(minesCount);
    const incrementBp = Math.round(multiplierBp / 2);

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const user = await manager
          .createQueryBuilder(User, 'user')
          .setLock('pessimistic_write')
          .where('user.id = :id', { id: userId })
          .getOne();
        if (!user) {
          throw new NotFoundException('User not found');
        }

        const currentChips = Number(user.chips) || 0;
        if (currentChips < betAmount) {
          throw new BadRequestException('Insufficient chips');
        }
        user.chips = currentChips - betAmount;
        await manager.save(user);

        const round = manager.create(MinesRound, {
          userId,
          betAmount,
          minesCount,
          tileCount: MINES_TILE_COUNT,
          minePositions,
          revealedTiles: [],
          multiplierBp,
          incrementBp,
          accumulatedWinnings: 0,
          status: 'active',
          serverSeed,
          serverSeedHash,
        });
        await manager.save(round);

        return {
          roundId: round.id,
          serverSeedHash,
          multiplier: multiplierBp / 10000,
          chips: user.chips,
        };
      });

      await this.refreshMinasChatPresence();
      return result;
    } catch (err: any) {
      if (err?.code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException('You already have an active Mines round');
      }
      throw err;
    }
  }

  async revealTile(userId: string, dto: RevealTileDto) {
    const { roundId, tileIndex } = dto;

    return this.dataSource.transaction(async (manager) => {
      const round = await manager
        .createQueryBuilder(MinesRound, 'round')
        .setLock('pessimistic_write')
        .where('round.id = :id', { id: roundId })
        .getOne();

      if (!round || round.userId !== userId) {
        throw new NotFoundException('Round not found');
      }
      if (round.status !== 'active') {
        throw new BadRequestException('Round is not active');
      }
      if (round.revealedTiles.includes(tileIndex)) {
        throw new BadRequestException('Tile already revealed');
      }

      const isMine = round.minePositions.includes(tileIndex);

      if (isMine) {
        round.status = 'busted';
        round.resolvedAt = new Date();
        await manager.save(round);

        return {
          result: 'bomb' as const,
          busted: true,
          minePositions: round.minePositions,
          serverSeed: round.serverSeed,
        };
      }

      round.revealedTiles = [...round.revealedTiles, tileIndex];
      const winThisStep = Math.round((round.betAmount * round.multiplierBp) / 10000);
      round.accumulatedWinnings = (Number(round.accumulatedWinnings) || 0) + winThisStep;
      round.multiplierBp += round.incrementBp;
      await manager.save(round);

      return {
        result: 'diamond' as const,
        busted: false,
        multiplier: round.multiplierBp / 10000,
        accumulatedWinnings: round.accumulatedWinnings,
      };
    });
  }

  async cashout(userId: string, dto: CashoutDto) {
    const { roundId } = dto;

    const result = await this.dataSource.transaction(async (manager) => {
      const round = await manager
        .createQueryBuilder(MinesRound, 'round')
        .setLock('pessimistic_write')
        .where('round.id = :id', { id: roundId })
        .getOne();

      if (!round || round.userId !== userId) {
        throw new NotFoundException('Round not found');
      }
      if (round.status !== 'active') {
        throw new BadRequestException('Round is not active');
      }

      const winAmount = Number(round.accumulatedWinnings) || 0;
      if (winAmount <= 0) {
        throw new BadRequestException('Nothing to cash out yet');
      }

      const user = await manager
        .createQueryBuilder(User, 'user')
        .setLock('pessimistic_write')
        .where('user.id = :id', { id: userId })
        .getOne();
      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.chips = (Number(user.chips) || 0) + winAmount;
      await manager.save(user);

      await manager.save(
        manager.create(ChipsAward, {
          userId,
          amount: winAmount,
          source: 'game',
          game: 'minas',
        }),
      );

      round.status = 'cashed_out';
      round.resolvedAt = new Date();
      await manager.save(round);

      return { winAmount, chips: user.chips };
    });

    await this.refreshMinasChatPresence();
    return result;
  }

  // Mirrors BetManager.cs CalcularMultiplicador(): 0.5 + (minesCount - 5) * 0.1, in basis
  // points (always a multiple of 1000, so halving it for the increment is exact - no rounding).
  private baseMultiplierBp(minesCount: number): number {
    return 5000 + (minesCount - 5) * 1000;
  }

  /** A user's Mines round history — for the admin/mod "Actividad" view. */
  async getUserActivity(userId: string) {
    const rounds = await this.dataSource.manager.find(MinesRound, {
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 200,
    });

    const totalWagered = rounds.reduce((sum, r) => sum + Number(r.betAmount), 0);
    const totalWon = rounds
      .filter((r) => r.status === 'cashed_out')
      .reduce((sum, r) => sum + Number(r.accumulatedWinnings), 0);

    return {
      summary: { totalRounds: rounds.length, totalWagered, totalWon },
      rounds,
    };
  }

  private generateMinePositions(minesCount: number): number[] {
    const positions = new Set<number>();
    while (positions.size < minesCount) {
      positions.add(randomInt(0, MINES_TILE_COUNT));
    }
    return [...positions];
  }
}
