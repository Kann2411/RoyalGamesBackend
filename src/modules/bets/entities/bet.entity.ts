import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Game } from '../../games/entities/game.entity';

export enum BetStatus {
  PENDING = 'pending',
  WON = 'won',
  LOST = 'lost',
  CANCELLED = 'cancelled',
}

@Entity('bets')
export class Bet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  gameId: string;

  @Column({ type: 'bigint' })
  betAmount: number;

  @Column({ type: 'bigint', nullable: true })
  winAmount: number;

  @Column({
    type: 'enum',
    enum: BetStatus,
    default: BetStatus.PENDING,
  })
  status: BetStatus;

  @Column({ type: 'float', nullable: true })
  multiplier: number;

  // Provably Fair fields
  @Column({ type: 'varchar' })
  serverSeed: string;

  @Column({ type: 'varchar', nullable: true })
  clientSeed: string;

  @Column({ type: 'int', default: 0 })
  nonce: number;

  @Column({ type: 'jsonb', nullable: true })
  gameData: Record<string, any>; // JSON data for game-specific information

  @Column({ type: 'varchar', nullable: true })
  gameResult: string; // Store the result (e.g., 'heads', 'tails', 'number', etc.)

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', nullable: true })
  deviceInfo: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Game, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'gameId' })
  game: Game;
}
