import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PromoCodeType {
  CHIPS = 'chips',
  PERCENTAGE = 'percentage',
  FREE_SPIN = 'free_spin',
  BONUS = 'bonus',
}

@Entity('promo_codes')
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: PromoCodeType,
    default: PromoCodeType.CHIPS,
  })
  type: PromoCodeType;

  @Column({ type: 'bigint' })
  rewardAmount: number; // Amount of chips or percentage value

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  maxUses: number; // 0 means unlimited

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'int', default: 1 })
  usesPerUser: number; // How many times each user can use this code

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startsAt: Date;

  @Column({ type: 'varchar', nullable: true })
  createdBy: string; // Admin user ID who created the promo

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => User, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'user_promo_codes',
    joinColumn: { name: 'promoCodeId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  usedByUsers: User[];
}
