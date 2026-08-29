import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

/**
 * Progreso del contador de JACKPOT de SantaWilds, por jugador y por precio de apuesta (no un
 * solo contador global) - ver JackpotCounter.cs. Guardado server-side para que sobreviva salir
 * y volver a entrar al juego, y para que cambiar de apuesta y volver retome el mismo progreso
 * en vez de perderlo.
 */
@Entity('santawilds_jackpot_progress')
@Index(['userId', 'betAmount'], { unique: true })
export class SantaWildsJackpotProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'bigint' })
  betAmount: number;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
