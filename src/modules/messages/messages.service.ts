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
    const rows = await this.messageRepository.query(
      `
      SELECT * FROM (
        SELECT id, "senderId", "recipientId", content, "read", "createdAt"
        FROM messages
        WHERE ("senderId" = $1 AND "recipientId" = $2) OR ("senderId" = $2 AND "recipientId" = $1)
        ORDER BY "createdAt" DESC
        LIMIT $3
      ) sub
      ORDER BY "createdAt" ASC;
      `,
      [userId, otherUserId, limit],
    );

    await this.markThreadRead(userId, otherUserId);

    return rows;
  }

  async markThreadRead(userId: string, otherUserId: string): Promise<void> {
    await this.messageRepository.query(
      `UPDATE messages SET "read" = true WHERE "recipientId" = $1 AND "senderId" = $2 AND "read" = false`,
      [userId, otherUserId],
    );
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
