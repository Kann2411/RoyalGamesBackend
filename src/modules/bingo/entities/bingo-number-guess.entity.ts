import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * One player's guess at which number will be drawn first in a WAITING game's next round (see the
 * "Adivina el primer número" panel). Only ever checked once, right when that game transitions to
 * RUNNING (BingoService.announceNumberGuessWinners) - the draw itself doesn't exist yet while the
 * game is WAITING (see startGameTransaction), so there's no way to know the answer in advance.
 *
 * Two unique indexes (see the CreateBingoNumberGuesses migration) guard against cheating:
 * one guess per player per round, AND one guess per IP address per round - the latter is a
 * lightweight defense against a single person spinning up several accounts to cover more numbers.
 */
@Entity('bingo_number_guesses')
@Index(['gameId', 'playerId'])
export class BingoNumberGuess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  gameId: string;

  @Column({ type: 'uuid' })
  playerId: string;

  @Column({ type: 'int' })
  guessedNumber: number;

  /** Captured server-side from the WS connection (see BingoGateway.extractClientIp) - never
   *  trusted from the client. Null if the connection somehow didn't carry one. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
