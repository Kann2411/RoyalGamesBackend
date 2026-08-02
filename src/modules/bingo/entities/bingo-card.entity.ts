import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BingoGame } from './bingo-game.entity';
import { BingoPlayer } from './bingo-player.entity';

@Entity('bingo_cards')
@Index(['gameId'])
@Index(['ownerId'])
export class BingoCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  gameId: string;

  @ManyToOne(() => BingoGame, (game) => game.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: BingoGame;

  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => BingoPlayer, (player) => player.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: BingoPlayer;

  @Column({ type: 'jsonb' })
  numbers: number[];

  @Column({ type: 'jsonb', default: '{}' })
  marks: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  isWinning: boolean;

  @Column({ type: 'jsonb', default: '[]' })
  claimedLines: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
