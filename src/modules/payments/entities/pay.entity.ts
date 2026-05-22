import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('pays')
export class Pay {
  @PrimaryColumn({ type: 'bigint' })
  paymentId: number;

  @Column({ type: 'varchar', nullable: true })
  paymentPlatform: string;

  @Column({ type: 'varchar' })
  price: string;

  @Column({ type: 'bigint' })
  chips: number;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', nullable: true })
  date: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
