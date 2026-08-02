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

@Entity('bingo_audit')
@Index(['entityType'])
@Index(['entityId'])
export class BingoAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  entityType: string;

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'varchar', length: 120 })
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  performedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => BingoGame, (game) => game.audits, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'entityId', referencedColumnName: 'id' })
  game: BingoGame;
}
