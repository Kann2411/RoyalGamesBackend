import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChipsTransactionDto } from './dtos/chips-transaction.dto';
import { ChipsRepository } from './repositories/chips.repository';
import { User } from '../users/entities/user.entity';
import { ChipsAwardSource } from './entities/chips-award.entity';
import { Pay } from '../payments/entities/pay.entity';

@Injectable()
export class ChipsService {
  constructor(
    private chipsRepository: ChipsRepository,
    @InjectRepository(Pay)
    private paysRepository: Repository<Pay>,
  ) {}

  async addChips(
    chipsTransactionDto: ChipsTransactionDto,
    source: ChipsAwardSource = 'game',
  ): Promise<Partial<User>> {
    const currentChips = await this.chipsRepository.getChips(
      chipsTransactionDto.userId,
    );

    if (currentChips === null) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.chipsRepository.addChips(
      chipsTransactionDto.userId,
      chipsTransactionDto.amount,
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    await this.chipsRepository.logAward(chipsTransactionDto.userId, chipsTransactionDto.amount, source);

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async removeChips(
    chipsTransactionDto: ChipsTransactionDto,
    source: ChipsAwardSource = 'game',
  ): Promise<Partial<User>> {
    const currentChips = await this.chipsRepository.getChips(
      chipsTransactionDto.userId,
    );

    if (currentChips === null) {
      throw new NotFoundException('User not found');
    }

    if (currentChips < chipsTransactionDto.amount) {
      throw new BadRequestException('Insufficient chips');
    }

    const updatedUser = await this.chipsRepository.removeChips(
      chipsTransactionDto.userId,
      chipsTransactionDto.amount,
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    // Only log admin-initiated removals (manual balance corrections). Game losses aren't
    // logged here — they'd otherwise net against the chips_awards sum the "top winners"
    // leaderboard relies on, turning "chips won" into "net profit" without being asked to.
    if (source === 'admin') {
      await this.chipsRepository.logAward(chipsTransactionDto.userId, -chipsTransactionDto.amount, source);
    }

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async getChips(userId: string): Promise<{ chips: number }> {
    const chips = await this.chipsRepository.getChips(userId);
    if (chips === null) {
      throw new NotFoundException('User not found');
    }
    return { chips };
  }

  /**
   * Unified "movement history" for a user, excluding gameplay (per design, only deposits and
   * non-game chip adjustments count as real "transactions"): deposits from the payments ledger
   * plus admin grants/removals and the one-time welcome bonus from the chips_awards ledger.
   */
  async getHistory(userId: string) {
    const [payments, awards] = await Promise.all([
      this.paysRepository.find({ where: { userId }, order: { createdAt: 'DESC' } }),
      this.chipsRepository.findNonGameAwards(userId),
    ]);

    const depositEntries = payments.map((pay) => ({
      id: pay.id,
      type: 'deposit',
      chips: Number(pay.chips),
      price: pay.price,
      paymentPlatform: pay.paymentPlatform,
      status: pay.status,
      date: pay.createdAt,
    }));

    const awardEntries = awards.map((award) => ({
      id: award.id,
      type: award.source === 'welcome' ? 'welcome' : 'admin_adjustment',
      chips: Number(award.amount),
      price: null,
      paymentPlatform: null,
      status: 'approved',
      date: award.createdAt,
    }));

    return [...depositEntries, ...awardEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }
}
