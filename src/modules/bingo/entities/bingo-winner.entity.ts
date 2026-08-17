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
  DOUBLE_LINE = 'doubleLine',
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

  @Column({ type: 'int', nullable: true })
  roundNumber: number | null;

  /** Set once the engine has broadcast this winner's chat announcement live (see
   *  BingoEngineService.processRoom / BingoService.announceDueWinners) - null means still pending,
   *  keeps the per-tick check idempotent so the same win doesn't get announced twice. */
  @Column({ type: 'timestamp', nullable: true })
  chatAnnouncedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
