import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class ChipsRepository {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async addChips(userId: string, amount: number): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (user) {
      user.chips = (user.chips || 0) + amount;
      return this.usersRepository.save(user);
    }
    return null;
  }

  async removeChips(userId: string, amount: number): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (user) {
      user.chips = Math.max(0, (user.chips || 0) - amount);
      return this.usersRepository.save(user);
    }
    return null;
  }

  async getChips(userId: string): Promise<number> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    return user ? user.chips || 0 : 0;
  }
}
