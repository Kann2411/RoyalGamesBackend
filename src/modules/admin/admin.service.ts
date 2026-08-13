import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Pay } from '../payments/entities/pay.entity';
import { Role } from '../../common/enums/role.enum';
import { PaymentStatus } from '../payments/enums/payment-status.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Pay)
    private paysRepository: Repository<Pay>,
  ) {}

  async getOverview() {
    const [
      totalUsers,
      bannedUsers,
      inactiveUsers,
      adminCount,
      modCount,
      onlineResult,
      circulationResult,
      depositedResult,
      todayResult,
      signupsTodayResult,
      topByChips,
      recentPayments,
    ] = await Promise.all([
      this.usersRepository.count(),
      this.usersRepository.count({ where: { banned: true } }),
      this.usersRepository.count({ where: { inactive: true } }),
      this.usersRepository.count({ where: { role: Role.ADMIN } }),
      this.usersRepository.count({ where: { role: Role.MOD } }),
      this.usersRepository.query(
        `SELECT COUNT(*)::int AS count FROM users WHERE "lastSeen" > now() - interval '5 minutes'`,
      ),
      this.usersRepository.query(`SELECT COALESCE(SUM(chips), 0)::bigint AS total FROM users`),
      this.paysRepository.query(
        `SELECT COALESCE(SUM(chips), 0)::bigint AS total FROM pays WHERE status = $1`,
        [PaymentStatus.APPROVED],
      ),
      this.paysRepository.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(chips), 0)::bigint AS chips
         FROM pays WHERE status = $1 AND "createdAt" >= date_trunc('day', now())`,
        [PaymentStatus.APPROVED],
      ),
      this.usersRepository.query(
        `SELECT COUNT(*)::int AS count FROM users WHERE "createdAt" >= date_trunc('day', now())`,
      ),
      this.usersRepository.query(
        `SELECT id, nick, chips, rank FROM users ORDER BY chips DESC LIMIT 10`,
      ),
      this.paysRepository.query(
        `SELECT u.nick AS nick, p.chips AS chips, p.price AS price, p."paymentPlatform" AS "paymentPlatform", p."createdAt" AS "createdAt"
         FROM pays p
         JOIN users u ON u.id = p."userId"
         WHERE p.status = $1
         ORDER BY p."createdAt" DESC
         LIMIT 10`,
        [PaymentStatus.APPROVED],
      ),
    ]);

    return {
      totalUsers,
      bannedUsers,
      inactiveUsers,
      adminCount,
      modCount,
      onlineUsers: Number(onlineResult?.[0]?.count ?? 0),
      totalChipsInCirculation: Number(circulationResult?.[0]?.total ?? 0),
      totalChipsDeposited: Number(depositedResult?.[0]?.total ?? 0),
      depositsTodayCount: Number(todayResult?.[0]?.count ?? 0),
      depositsTodayChips: Number(todayResult?.[0]?.chips ?? 0),
      newSignupsToday: Number(signupsTodayResult?.[0]?.count ?? 0),
      topByChips,
      recentPayments,
    };
  }
}
