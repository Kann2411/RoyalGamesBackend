import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SantaWildsJackpotProgress } from './entities/jackpot-progress.entity';
import { SetJackpotProgressDto } from './dtos/set-jackpot-progress.dto';

@Injectable()
export class SantaWildsService {
  constructor(
    @InjectRepository(SantaWildsJackpotProgress)
    private readonly jackpotProgressRepository: Repository<SantaWildsJackpotProgress>,
  ) {}

  /** Todos los contadores de JACKPOT de este jugador, uno por precio de apuesta. */
  async getJackpotProgress(userId: string): Promise<{ betAmount: number; progress: number }[]> {
    const rows = await this.jackpotProgressRepository.find({ where: { userId } });
    return rows.map((row) => ({ betAmount: Number(row.betAmount), progress: row.progress }));
  }

  /** El cliente manda el valor absoluto ya calculado (no un delta) - upsert simple sobre el par
   *  (userId, betAmount) único. Se llama cada vez que cambia el progreso de ese tier: al caer un
   *  símbolo JACKPOT, o al resetear a 0 cuando se completa el bonus. */
  async setJackpotProgress(dto: SetJackpotProgressDto): Promise<{ betAmount: number; progress: number }> {
    const existing = await this.jackpotProgressRepository.findOne({
      where: { userId: dto.userId, betAmount: dto.betAmount },
    });

    if (existing) {
      existing.progress = dto.progress;
      await this.jackpotProgressRepository.save(existing);
    } else {
      const created = this.jackpotProgressRepository.create({
        userId: dto.userId,
        betAmount: dto.betAmount,
        progress: dto.progress,
      });
      await this.jackpotProgressRepository.save(created);
    }

    return { betAmount: dto.betAmount, progress: dto.progress };
  }
}
