import { Entity, Column, CreateDateColumn, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type PrizePeriod = 'weekly' | 'monthly';

@Entity('prize_awards')
@Unique('UQ_prize_awards_period_key_rank', ['period', 'periodKey', 'rank'])
export class PrizeAward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['weekly', 'monthly'] })
  period: PrizePeriod;

  // ISO week ("2026-W33") for weekly, "2026-08" for monthly — identifies the period so it
  // can't be paid out twice.
  @Column({ type: 'varchar', length: 10 })
  periodKey: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'int' })
  rank: number;

  @Column({ type: 'bigint' })
  amount: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
