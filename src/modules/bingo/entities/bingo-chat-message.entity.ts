import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BingoRoom } from './bingo-room.entity';
import { BingoPlayer } from './bingo-player.entity';

export enum BingoChatMessageType {
  CHAT = 'chat',
  SYSTEM = 'system',
}

@Entity('bingo_chat_messages')
@Index(['roomId', 'createdAt'])
export class BingoChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  roomId: string;

  @ManyToOne(() => BingoRoom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: BingoRoom;

  @Column({ type: 'uuid', nullable: true })
  playerId: string | null;

  @ManyToOne(() => BingoPlayer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'playerId' })
  player: BingoPlayer;

  // Snapshotted at send time (same reasoning as displayName above) - lets the client fetch this
  // sender's real avatar (/user/{userId}/avatar-image) without joining BingoPlayer on every read.
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  // Snapshotted at send time (not joined live) so a later rename/promotion doesn't rewrite
  // history, and so a system message about a winner still renders correctly.
  @Column({ type: 'varchar', length: 120 })
  displayName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  role: string | null;

  @Column({ type: 'varchar', length: 1000 })
  message: string;

  @Column({ type: 'varchar', length: 20, default: BingoChatMessageType.CHAT })
  type: BingoChatMessageType;

  @Column({ type: 'timestamp' })
  createdAt: Date;
}
