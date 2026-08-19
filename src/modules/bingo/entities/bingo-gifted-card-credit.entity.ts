import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BingoPlayer } from './bingo-player.entity';
import { BingoGame } from './bingo-game.entity';

/**
 * A single "free card" credit gifted from one player to another. Not tied to any specific game -
 * scoped only to a price tier (betAmount), redeemable whenever the recipient wants, in any room
 * at that same tier (see BingoService.purchaseCardTransaction, which auto-redeems these before
 * charging chips). Survives the recipient leaving/reconnecting since it's just a DB row keyed to
 * their BingoPlayer, not anything tied to a live connection or a specific game's lifecycle.
 */
@Entity('bingo_gifted_card_credits')
@Index(['recipientPlayerId', 'betAmount', 'redeemedAt'])
export class BingoGiftedCardCredit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  recipientPlayerId: string;

  @ManyToOne(() => BingoPlayer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientPlayerId' })
  recipient: BingoPlayer;

  /** Price tier this credit is valid for (ej. 250000) - matched against room.betAmount at
   *  redemption time, same value as whatever room it was gifted from. */
  @Column({ type: 'bigint' })
  betAmount: number;

  @Column({ type: 'uuid', nullable: true })
  giftedByPlayerId: string | null;

  @ManyToOne(() => BingoPlayer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'giftedByPlayerId' })
  giftedBy: BingoPlayer;

  // Snapshotted at gift time (not joined live) so a later rename doesn't rewrite who-gifted-what.
  @Column({ type: 'varchar', length: 120, nullable: true })
  giftedByDisplayName: string | null;

  @Column({ type: 'timestamp', nullable: true })
  redeemedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  redeemedGameId: string | null;

  @ManyToOne(() => BingoGame, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'redeemedGameId' })
  redeemedGame: BingoGame;

  @CreateDateColumn()
  createdAt: Date;
}
