import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiHideProperty } from '@nestjs/swagger';
import { BingoGame } from './bingo-game.entity';

@Entity('bingo_rounds')
@Index(['gameId'])
export class BingoRound {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  gameId: string;

  @ApiHideProperty()
  @ManyToOne(() => BingoGame, (game) => game.rounds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: BingoGame;

  @Column({ type: 'int', default: 0 })
  roundNumber: number;

  @Column({ type: 'int' })
  drawnNumber: number;

  @CreateDateColumn()
  drawnAt: Date;
}
