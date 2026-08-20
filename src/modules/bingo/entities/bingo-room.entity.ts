import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BingoGame } from './bingo-game.entity';

export enum BingoRoomType {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Entity('bingo_rooms')
@Index(['name'])
export class BingoRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'enum', enum: BingoRoomType, default: BingoRoomType.PUBLIC })
  type: BingoRoomType;

  @Column({ type: 'bigint', default: 0 })
  betAmount: number;

  @Column({ type: 'int', default: 8 })
  maxPlayers: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /** The single virtual room backing the main-menu chat/presence panel - never has real bingo
   *  games, excluded from the room list and from the engine's tick loop (isActive stays false). */
  @Column({ type: 'boolean', default: false })
  isLobby: boolean;

  /** Distinguishes isLobby rooms from each other (ej. 'bingo' for the main-menu panel, 'minas'
   *  for the Minas game's own chat channel). Null for non-lobby rooms. Unique among isLobby=true
   *  rows - see AddLobbyKeyToBingoRooms migration. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  lobbyKey: string | null;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;

  /** Prize amount of the last BINGO (not línea/doble línea/superbingo) won in this room - shown on
   *  the room list card so players can see "how much the last winner here got" before joining.
   *  Survives across games (unlike BingoWinner rows, which get deleted when their game finishes) -
   *  updated in BingoService.finishGameTransaction whenever a game that just finished had a bingo
   *  winner. 0 until the room's very first bingo ever happens. */
  @Column({ type: 'bigint', default: 0 })
  lastBingoPrizeAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => BingoGame, (game) => game.room)
  games: BingoGame[];
}
