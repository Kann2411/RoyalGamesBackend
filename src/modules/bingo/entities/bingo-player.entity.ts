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
import { BingoTicket } from './bingo-ticket.entity';
import { BingoCard } from './bingo-card.entity';
import { User } from '../../users/entities/user.entity';

export enum BingoPlayerStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BANNED = 'banned',
}

@Entity('bingo_players')
@Index(['username'], { unique: true })
export class BingoPlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  displayName: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'bigint', default: 0 })
  chips: number;

  @Column({ type: 'enum', enum: BingoPlayerStatus, default: BingoPlayerStatus.OFFLINE })
  status: BingoPlayerStatus;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => BingoTicket, (ticket) => ticket.player)
  tickets: BingoTicket[];

  @OneToMany(() => BingoCard, (card) => card.owner)
  cards: BingoCard[];
}
