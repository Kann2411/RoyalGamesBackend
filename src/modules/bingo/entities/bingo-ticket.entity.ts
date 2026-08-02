import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BingoGame } from './bingo-game.entity';
import { BingoPlayer } from './bingo-player.entity';

@Entity('bingo_tickets')
@Index(['gameId'])
@Index(['playerId'])
export class BingoTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  gameId: string;

  @ManyToOne(() => BingoGame, (game) => game.tickets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: BingoGame;

  @Column({ type: 'uuid' })
  playerId: string;

  @ManyToOne(() => BingoPlayer, (player) => player.tickets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerId' })
  player: BingoPlayer;

  @Column({ type: 'jsonb', default: '[]' })
  cardIds: string[];

  @Column({ type: 'bigint', default: 0 })
  cost: number;

  @CreateDateColumn()
  purchasedAt: Date;
}
