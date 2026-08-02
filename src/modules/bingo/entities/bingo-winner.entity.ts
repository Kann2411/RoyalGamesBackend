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
import { BingoCard } from './bingo-card.entity';

export enum BingoWinType {
  LINE = 'linea',
  BINGO = 'bingo',
  SUPERBINGO = 'superbingo',
}

@Entity('bingo_winners')
@Index(['gameId'])
export class BingoWinner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  gameId: string;

  @ManyToOne(() => BingoGame, (game) => game.winners, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: BingoGame;

  @Column({ type: 'uuid' })
  playerId: string;

  @ManyToOne(() => BingoPlayer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerId' })
  player: BingoPlayer;

  @Column({ type: 'uuid', nullable: true })
  cardId: string;

  @ManyToOne(() => BingoCard, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cardId' })
  card: BingoCard;

  @Column({ type: 'bigint', default: 0 })
  prizeAmount: number;

  @Column({ type: 'enum', enum: BingoWinType })
  winType: BingoWinType;

  @CreateDateColumn()
  createdAt: Date;
}
