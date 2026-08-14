import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Block } from './entities/block.entity';
import { User } from '../users/entities/user.entity';

function toPublicUser(user: User) {
  const { id, nick, rank, image } = user;
  return { id, nick, rank, image };
}

@Injectable()
export class BlocksService {
  constructor(
    @InjectRepository(Block)
    private blocksRepository: Repository<Block>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) {
      throw new BadRequestException('No puedes bloquearte a ti mismo');
    }
    const target = await this.usersRepository.findOne({ where: { id: blockedId } });
    if (!target) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const existing = await this.blocksRepository.findOne({ where: { blockerId, blockedId } });
    if (existing) return;
    await this.blocksRepository.save(this.blocksRepository.create({ blockerId, blockedId }));
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.blocksRepository.delete({ blockerId, blockedId });
  }

  /** True if either user has blocked the other — used to gate messages/friend requests. */
  async isBlockedEitherDirection(userAId: string, userBId: string): Promise<boolean> {
    const count = await this.blocksRepository
      .createQueryBuilder('b')
      .where(
        '(b.blockerId = :userAId AND b.blockedId = :userBId) OR (b.blockerId = :userBId AND b.blockedId = :userAId)',
        { userAId, userBId },
      )
      .getCount();
    return count > 0;
  }

  async getStatus(blockerId: string, blockedId: string): Promise<{ blockedByMe: boolean }> {
    const existing = await this.blocksRepository.findOne({ where: { blockerId, blockedId } });
    return { blockedByMe: !!existing };
  }

  async listBlocked(blockerId: string) {
    const rows = await this.blocksRepository.find({
      where: { blockerId },
      relations: ['blocked'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => ({ id: row.id, user: toPublicUser(row.blocked), since: row.createdAt }));
  }
}
