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

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  nick: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  email: string;

  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'varchar', nullable: true })
  avatar: string;

  @Column({ type: 'varchar', nullable: true })
  image: string;

  @Column({ type: 'int', nullable: true })
  age: number;

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  country: string;

  @Column({ type: 'varchar' })
  sexo: string;

  @Column({ type: 'bigint', default: 0 })
  chips: number;

  @Column({ type: 'boolean', default: false })
  admin: boolean;

  @Column({ type: 'boolean', default: false })
  banned: boolean;

  @Column({ type: 'boolean', default: false })
  inactive: boolean;

  @Column({ type: 'boolean', default: false })
  firstChips: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => Game, (game) => game.users)
  games: Game[];

  @OneToMany(() => Pay, (pay) => pay.user, { cascade: true })
  payments: Pay[];
}
