import { Injectable, ConflictException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ChipsAward } from '../chips/entities/chips-award.entity';
import { PrizeAward, PrizePeriod } from '../chips/entities/prize-award.entity';
import { User } from '../users/entities/user.entity';

const PRIZE_AMOUNTS: Record<PrizePeriod, number[]> = {
  weekly: [10_000_000, 5_000_000, 3_000_000, 2_000_000, 1_000_000],
  monthly: [100_000_000, 50_000_000, 25_000_000, 10_000_000, 5_000_000],
};

// Postgres date_trunc('week', ...) / ('month', ...) bound the query window; to_char(...) with
// the matching ISO format produces the label used to key + de-duplicate that same window.
const TRUNC_UNIT: Record<PrizePeriod, string> = { weekly: 'week', monthly: 'month' };
const PERIOD_KEY_FORMAT: Record<PrizePeriod, string> = { weekly: 'IYYY-"W"IW', monthly: 'YYYY-MM' };

@Injectable()
export class PrizesService {
  constructor(
    @InjectRepository(ChipsAward)
    private chipsAwardRepository: Repository<ChipsAward>,
    @InjectRepository(PrizeAward)
    private prizeAwardRepository: Repository<PrizeAward>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  private async getPeriodKey(period: PrizePeriod): Promise<string> {
    const [{ key }] = await this.dataSource.query(
      `SELECT to_char(now(), $1) AS key`,
      [PERIOD_KEY_FORMAT[period]],
    );
    return key;
  }

  private async getTopPlayers(period: PrizePeriod, limit: number) {
    return this.chipsAwardRepository.query(
      `
      SELECT u.id, u.nick, u.rank, SUM(ca.amount)::bigint AS "totalWon"
      FROM chips_awards ca
      JOIN users u ON u.id = ca."userId"
      WHERE ca.source = 'game' AND ca."createdAt" >= date_trunc('${TRUNC_UNIT[period]}', now())
      GROUP BY u.id, u.nick, u.rank
      ORDER BY "totalWon" DESC
      LIMIT $1;
      `,
      [limit],
    );
  }

  async getPreview(period: PrizePeriod) {
    const periodKey = await this.getPeriodKey(period);
    const amounts = PRIZE_AMOUNTS[period];
    const [topPlayers, alreadyAwarded] = await Promise.all([
      this.getTopPlayers(period, amounts.length),
      this.prizeAwardRepository.existsBy({ period, periodKey }),
    ]);
    return {
      period,
      periodKey,
      alreadyAwarded,
      amounts,
      topPlayers,
    };
  }

  async award(period: PrizePeriod) {
    const periodKey = await this.getPeriodKey(period);
    const amounts = PRIZE_AMOUNTS[period];

    const alreadyAwarded = await this.prizeAwardRepository.existsBy({ period, periodKey });
    if (alreadyAwarded) {
      throw new ConflictException(`Los premios de este ${period === 'weekly' ? 'semana' : 'mes'} ya fueron otorgados`);
    }

    const topPlayers = await this.getTopPlayers(period, amounts.length);
    if (topPlayers.length === 0) {
      throw new ConflictException('Todavía no hay ganadores en este período');
    }

    return this.dataSource.manager.transaction(async (manager) => {
      const results = [];
      for (let i = 0; i < topPlayers.length; i++) {
        const player = topPlayers[i];
        const amount = amounts[i];
        const rank = i + 1;

        const user = await manager.findOne(User, { where: { id: player.id }, lock: { mode: 'pessimistic_write' } });
        if (!user) continue;
        user.chips = (Number(user.chips) || 0) + amount;
        await manager.save(user);

        await manager.save(ChipsAward, manager.create(ChipsAward, { userId: player.id, amount, source: 'prize' }));
        await manager.save(
          PrizeAward,
          manager.create(PrizeAward, { period, periodKey, userId: player.id, rank, amount }),
        );

        results.push({ id: player.id, nick: player.nick, rank, amount });
      }
      return { period, periodKey, awarded: results };
    });
  }
}
