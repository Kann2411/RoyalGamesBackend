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
}
