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

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => BingoGame, (game) => game.room)
  games: BingoGame[];
}
