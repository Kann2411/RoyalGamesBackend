import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * "Compra automática" - a player commits to auto-buying `cardsPerGame` cards, in THIS room, for
 * the next `remainingGames` rounds, without needing to be connected. Processed server-side
 * (BingoService.processAutoBuyForNewGame) the instant a new WAITING game is created for the room -
 * that's what makes it survive the player disconnecting/closing the app entirely, unlike anything
 * driven by the client (a client-side loop would just stop the moment they left).
 */
@Entity('bingo_auto_buy_subscriptions')
@Index(['roomId', 'active'])
export class BingoAutoBuySubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playerId: string;

  @Column({ type: 'uuid' })
  roomId: string;

  @Column({ type: 'int' })
  cardsPerGame: number;

  /** Counts down by one on every successful auto-buy - subscription deactivates itself (see
   *  processAutoBuyForNewGame) once this hits 0, or immediately on the first failed attempt
   *  (ej. insufficient chips) rather than retrying forever every round. */
  @Column({ type: 'int' })
  remainingGames: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
