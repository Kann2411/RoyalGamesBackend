import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ChipsTransactionDto } from './dtos/chips-transaction.dto';
import { ChipsRepository } from './repositories/chips.repository';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ChipsService {
  constructor(private chipsRepository: ChipsRepository) {}

  async addChips(chipsTransactionDto: ChipsTransactionDto): Promise<Partial<User>> {
    const currentChips = await this.chipsRepository.getChips(
      chipsTransactionDto.userId,
    );

    if (currentChips === null) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.chipsRepository.addChips(
      chipsTransactionDto.userId,
      chipsTransactionDto.amount,
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async removeChips(chipsTransactionDto: ChipsTransactionDto): Promise<Partial<User>> {
    const currentChips = await this.chipsRepository.getChips(
      chipsTransactionDto.userId,
    );

    if (currentChips === null) {
      throw new NotFoundException('User not found');
    }

    if (currentChips < chipsTransactionDto.amount) {
      throw new BadRequestException('Insufficient chips');
    }

    const updatedUser = await this.chipsRepository.removeChips(
      chipsTransactionDto.userId,
      chipsTransactionDto.amount,
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async getChips(userId: string): Promise<{ chips: number }> {
    const chips = await this.chipsRepository.getChips(userId);
    if (chips === null) {
      throw new NotFoundException('User not found');
    }
    return { chips };
  }
}
