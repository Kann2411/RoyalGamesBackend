import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { ChipsAward, ChipsAwardSource } from '../entities/chips-award.entity';

@Injectable()
export class ChipsRepository {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(ChipsAward)
    private chipsAwardRepository: Repository<ChipsAward>,
  ) {}

  async logAward(
    userId: string,
    amount: number,
    source: ChipsAwardSource,
    game: string | null = null,
    performedBy: string | null = null,
  ): Promise<void> {
    await this.chipsAwardRepository.save(
      this.chipsAwardRepository.create({ userId, amount, source, game, performedBy }),
    );
  }

  /** Non-gameplay chip movements for a user's own history (admin adjustments + welcome bonus). */
  async findNonGameAwards(userId: string): Promise<ChipsAward[]> {
    return this.chipsAwardRepository
      .createQueryBuilder('ca')
      .where('ca.userId = :userId AND ca.source != :game', { userId, game: 'game' })
      .orderBy('ca.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Manual panel grants/removals a specific admin/mod executed — for the mod-audit view.
   * Joins the recipient's nick so the audit trail reads as "gave X to <nick>", not a bare UUID.
   */
  async findAwardsPerformedBy(modId: string, limit: number): Promise<Array<ChipsAward & { recipientNick: string }>> {
    const { entities, raw } = await this.chipsAwardRepository
      .createQueryBuilder('ca')
      .leftJoin(User, 'u', 'u.id = ca.userId')
      .addSelect('u.nick', 'recipientNick')
      .where('ca.performedBy = :modId', { modId })
      .orderBy('ca.createdAt', 'DESC')
      .take(limit)
      .getRawAndEntities();
    return entities.map((entity, i) => ({ ...entity, recipientNick: raw[i]?.recipientNick ?? null }));
  }

  /**
   * Chips a user gifted away to other players themselves (player-to-player "Regalar Fichas").
   * No recipient join here — the sender/receiver rows `giftChips` creates aren't linked by any
   * shared key (just two independent ChipsAward inserts), so there's no reliable way to join
   * back to "who received it" without changing that write path; amount + date is still enough
   * to answer "how much did this mod gift away themselves."
   */
  async findOutgoingGifts(userId: string, limit: number): Promise<ChipsAward[]> {
    return this.chipsAwardRepository
      .createQueryBuilder('ca')
      .where('ca.userId = :userId AND ca.source = :source AND ca.amount < 0', { userId, source: 'gift' })
      .orderBy('ca.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async addChips(userId: string, amount: number): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (user) {
      const current = Number(user.chips) || 0;
      user.chips = current + Number(amount);
      return this.usersRepository.save(user);
    }
    return null;
  }

  async removeChips(userId: string, amount: number): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (user) {
      const current = Number(user.chips) || 0;
      user.chips = Math.max(0, current - Number(amount));
      return this.usersRepository.save(user);
    }
    return null;
  }

  async getChips(userId: string): Promise<number> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    return user ? Number(user.chips) || 0 : 0;
  }
}
