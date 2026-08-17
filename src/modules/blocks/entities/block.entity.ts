import { Entity, Column, CreateDateColumn, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('blocks')
@Unique('UQ_blocks_pair', ['blockerId', 'blockedId'])
export class Block {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  blockerId: string;

  @Column({ type: 'uuid' })
  blockedId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockerId' })
  blocker: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockedId' })
  blocked: User;
}
