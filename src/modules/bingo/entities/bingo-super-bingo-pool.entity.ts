import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BingoGame } from './bingo-game.entity';

@Entity('bingo_super_bingo_pools')
@Index(['roomId'])
export class BingoSuperBingoPool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  roomId: string;

  @Column({ type: 'bigint', default: 0 })
  amount: number;

  @Column({ type: 'int', default: 50 })
  thresholdBall: number;

  @Column({ type: 'bigint', default: 0 })
  resetBaseAmount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUpdatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  reservedForGameId: string | null;

  @ManyToOne(() => BingoGame, { nullable: true })
  @JoinColumn({ name: 'reservedForGameId' })
  reservedForGame: BingoGame;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => BingoGame, (game) => game.superbingoPool)
  games: BingoGame[];
}
