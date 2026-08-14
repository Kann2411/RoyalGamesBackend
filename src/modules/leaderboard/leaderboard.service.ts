import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChipsAward } from '../chips/entities/chips-award.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(ChipsAward)
    private chipsAwardRepository: Repository<ChipsAward>,
  ) {}

  /**
   * Top players by chips actually won in the games (source='game'), not deposits or
   * admin-granted chips. Only reflects awards logged since the chips_awards ledger was
   * introduced — there's no historical record from before that.
   */
  async getTopWinners(limit = 10) {
    return this.chipsAwardRepository.query(
      `
      SELECT u.id, u.nick, u.rank, SUM(ca.amount)::bigint AS "totalWon"
      FROM chips_awards ca
      JOIN users u ON u.id = ca."userId"
      WHERE ca.source = 'game'
      GROUP BY u.id, u.nick, u.rank
      ORDER BY "totalWon" DESC
      LIMIT $1;
      `,
      [limit],
    );
  }

  /**
   * Same idea as getTopWinners but scoped to a single game (see game-origins.ts for how the
   * game gets tagged on each award). Only awards logged after the `game` column was added
   * carry this tag, so per-game rankings start from that point, not from the game's launch.
   */
  async getTopWinnersByGame(gameSlug: string, limit = 10) {
    return this.chipsAwardRepository.query(
      `
      SELECT u.id, u.nick, u.rank, SUM(ca.amount)::bigint AS "totalWon"
      FROM chips_awards ca
      JOIN users u ON u.id = ca."userId"
      WHERE ca.source = 'game' AND ca.game = $2
      GROUP BY u.id, u.nick, u.rank
      ORDER BY "totalWon" DESC
      LIMIT $1;
      `,
      [limit, gameSlug],
    );
  }

  /**
   * Individual recent wins (not aggregated per player) for the public "live winners" ticker
   * on the guest landing page. `game` is the slug from gamesCatalog.js — the frontend resolves
   * it to a display name.
   */
  async getRecentWins(limit = 10) {
    return this.chipsAwardRepository.query(
      `
      SELECT ca.id, u.nick, ca.amount, ca.game, ca."createdAt"
      FROM chips_awards ca
      JOIN users u ON u.id = ca."userId"
      WHERE ca.source = 'game' AND ca.amount > 0
      ORDER BY ca."createdAt" DESC
      LIMIT $1;
      `,
      [limit],
    );
  }
}
