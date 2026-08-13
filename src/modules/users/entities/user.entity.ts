import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { Game } from '../../games/entities/game.entity';
import { Pay } from '../../payments/entities/pay.entity';
import { Withdrawal } from '../../withdrawals/entities/withdrawal.entity';
import { Bet } from '../../bets/entities/bet.entity';
import { PromoCode } from '../../promo-codes/entities/promo-code.entity';
import { Role } from '../../../common/enums/role.enum';
import { RankTier } from '../../../common/enums/rank-tier.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  nick: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ name: 'avatar_bin', type: 'bytea', nullable: true })
  avatarBin: Buffer;

  @Column({ name: 'avatar_mime', type: 'varchar', nullable: true })
  avatarMime: string;

  @Column({ type: 'jsonb', nullable: true })
  avatarData: any;

  @Column({ type: 'varchar', nullable: true })
  googleId: string;

  @Column({ type: 'varchar', nullable: true })
  image: string;

  @Column({ type: 'int', nullable: true })
  age: number;

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  country: string;

  @Column({ type: 'varchar', nullable: true })
  sexo: string;

  

  @Column({ type: 'bigint', default: 0 })
  chips: number;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @Column({ type: 'boolean', default: false })
  banned: boolean;

  @Column({ type: 'boolean', default: false })
  inactive: boolean;

  @Column({ type: 'boolean', default: false })
  firstChips: boolean;

  @Column({ type: 'enum', enum: RankTier, default: RankTier.BRONZE })
  rank: RankTier;

  @Column({ type: 'bigint', default: 0 })
  totalChipsDeposited: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => Game, (game) => game.users)
  games: Game[];

  @OneToMany(() => Pay, (pay) => pay.user, { cascade: true })
  payments: Pay[];

  @OneToMany(() => Withdrawal, (withdrawal) => withdrawal.user, { cascade: true })
  withdrawals: Withdrawal[];

  @OneToMany(() => Bet, (bet) => bet.user, { cascade: true })
  bets: Bet[];

  @ManyToMany(() => PromoCode, (promoCode) => promoCode.usedByUsers)
  promoCodes: PromoCode[];
}
