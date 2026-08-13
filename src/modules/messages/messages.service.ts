import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw } from 'typeorm';
import { Message } from './entities/message.entity';
import { SendMessageDto } from './dtos/send-message.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  private async findUserByNick(nick: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { nick: Raw((alias) => `LOWER(${alias}) = LOWER(:nick)`, { nick }) },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async sendMessage(senderId: string, dto: SendMessageDto): Promise<Message> {
    const recipient = await this.findUserByNick(dto.recipientNick);
    if (recipient.id === senderId) {
      throw new BadRequestException('No puedes enviarte un mensaje a ti mismo');
    }

    const message = this.messageRepository.create({
      senderId,
      recipientId: recipient.id,
      content: dto.content,
      read: false,
    });
    return this.messageRepository.save(message);
  }

  async getThread(userId: string, otherUserId: string, limit = 50): Promise<Message[]> {
    const rows = await this.messageRepository
      .createQueryBuilder('m')
      .where(
        '(m.senderId = :userId AND m.recipientId = :otherUserId) OR (m.senderId = :otherUserId AND m.recipientId = :userId)',
        { userId, otherUserId },
      )
      .orderBy('m.createdAt', 'DESC')
      .take(limit)
      .getMany();

    await this.markThreadRead(userId, otherUserId);

    return rows.reverse();
  }

  async markThreadRead(userId: string, otherUserId: string): Promise<void> {
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ read: true })
      .where('"recipientId" = :userId AND "senderId" = :otherUserId AND "read" = false', {
        userId,
        otherUserId,
      })
      .execute();
  }

  /**
   * Returns, for every user this user has ever exchanged messages with, that partner's
   * public info + the last message in the thread + unread count. Single SQL statement
   * (DISTINCT ON per partner + a lateral unread-count join) to avoid an N+1 query loop.
   */
  async getConversations(userId: string): Promise<any[]> {
    return this.messageRepository.query(
      `
      SELECT
        m.partner_id AS "partnerId",
        u.nick AS "partnerNick",
        u.rank AS "partnerRank",
        u.image AS "partnerImage",
        m.content AS "lastContent",
        m."createdAt" AS "lastCreatedAt",
        m."senderId" AS "lastSenderId",
        COALESCE(unread.cnt, 0) AS "unreadCount"
      FROM (
        SELECT DISTINCT ON (partner_id)
          CASE WHEN "senderId" = $1 THEN "recipientId" ELSE "senderId" END AS partner_id,
          content, "createdAt", "senderId"
        FROM messages
        WHERE "senderId" = $1 OR "recipientId" = $1
        ORDER BY partner_id, "createdAt" DESC
      ) m
      JOIN users u ON u.id = m.partner_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt
        FROM messages m2
        WHERE m2."senderId" = m.partner_id AND m2."recipientId" = $1 AND m2."read" = false
      ) unread ON true
      ORDER BY m."createdAt" DESC;
      `,
      [userId],
    );
  }
}
