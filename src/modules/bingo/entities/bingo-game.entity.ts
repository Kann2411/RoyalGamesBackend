import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { BingoRoom } from './bingo-room.entity';
import { BingoTicket } from './bingo-ticket.entity';
import { BingoCard } from './bingo-card.entity';
import { BingoRound } from './bingo-round.entity';
import { BingoWinner } from './bingo-winner.entity';
import { BingoSuperBingoPool } from './bingo-super-bingo-pool.entity';
import { BingoAudit } from './bingo-audit.entity';

export enum BingoGameState {
  WAITING = 'waiting',
  RUNNING = 'running',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

@Entity('bingo_games')
@Index(['roomId'])
export class BingoGame {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  roomId: string;

  @ManyToOne(() => BingoRoom, (room) => room.games, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: BingoRoom;

  @Column({ type: 'enum', enum: BingoGameState, default: BingoGameState.WAITING })
  state: BingoGameState;

  @Column({ type: 'timestamp', nullable: true })
  startAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endAt: Date;

  @Column({ type: 'int', default: 0 })
  currentRound: number;

  @Column({ type: 'uuid', nullable: true })
  superbingoPoolId: string;

  @ManyToOne(() => BingoSuperBingoPool, { nullable: true })
  @JoinColumn({ name: 'superbingoPoolId' })
  superbingoPool: BingoSuperBingoPool;

  @Column({ type: 'jsonb', nullable: true })
  resultSummary: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  persistedSnapshot: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => BingoTicket, (ticket) => ticket.game)
  tickets: BingoTicket[];

  @OneToMany(() => BingoCard, (card) => card.game)
  cards: BingoCard[];

  @OneToMany(() => BingoRound, (round) => round.game)
  rounds: BingoRound[];

  @OneToMany(() => BingoWinner, (winner) => winner.game)
  winners: BingoWinner[];

  @OneToMany(() => BingoAudit, (audit) => audit.game)
  audits: BingoAudit[];
}
