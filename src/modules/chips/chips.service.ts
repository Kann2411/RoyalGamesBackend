import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ChipsTransactionDto } from './dtos/chips-transaction.dto';
import { ChipsRepository } from './repositories/chips.repository';
import { User } from '../users/entities/user.entity';
import { ChipsAward, ChipsAwardSource } from './entities/chips-award.entity';
import { Pay } from '../payments/entities/pay.entity';

@Injectable()
export class ChipsService {
  constructor(
    private chipsRepository: ChipsRepository,
    @InjectRepository(Pay)
    private paysRepository: Repository<Pay>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async addChips(
    chipsTransactionDto: ChipsTransactionDto,
    source: ChipsAwardSource = 'game',
    game: string | null = null,
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

    await this.chipsRepository.logAward(chipsTransactionDto.userId, chipsTransactionDto.amount, source, source === 'game' ? game : null);

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

  /**
   * Direct chips transfer between two real users (the "Regalar Fichas" profile action).
   * Runs inside a DB transaction with row locks so two simultaneous gifts from the same
   * sender can't both read a stale balance and overdraw it.
   */
  async giftChips(fromUserId: string, toUserId: string, amount: number): Promise<{ fromChips: number; toChips: number }> {
    if (fromUserId === toUserId) {
      throw new BadRequestException('No puedes regalarte fichas a ti mismo');
    }
    if (!Number.isInteger(amount) || amount < 1) {
      throw new BadRequestException('Monto inválido');
    }

    return this.dataSource.manager.transaction(async (manager) => {
      const sender = await manager.findOne(User, { where: { id: fromUserId }, lock: { mode: 'pessimistic_write' } });
      if (!sender) {
        throw new NotFoundException('Usuario no encontrado');
      }
      const receiver = await manager.findOne(User, { where: { id: toUserId }, lock: { mode: 'pessimistic_write' } });
      if (!receiver) {
        throw new NotFoundException('Usuario destinatario no encontrado');
      }

      const senderChips = Number(sender.chips) || 0;
      if (senderChips < amount) {
        throw new BadRequestException('No tienes fichas suficientes');
      }

      sender.chips = senderChips - amount;
      receiver.chips = (Number(receiver.chips) || 0) + amount;
      await manager.save(sender);
      await manager.save(receiver);

      await manager.save(ChipsAward, manager.create(ChipsAward, { userId: fromUserId, amount: -amount, source: 'gift' }));
      await manager.save(ChipsAward, manager.create(ChipsAward, { userId: toUserId, amount, source: 'gift' }));

      return { fromChips: sender.chips, toChips: receiver.chips };
    });
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
      type:
        award.source === 'welcome'
          ? 'welcome'
          : award.source === 'gift'
            ? (Number(award.amount) < 0 ? 'gift_sent' : 'gift_received')
            : award.source === 'prize'
              ? 'prize'
              : 'admin_adjustment',
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
