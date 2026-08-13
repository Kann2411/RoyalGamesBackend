import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from './entities/support-ticket.entity';
import { SupportTicketMessage } from './entities/support-ticket-message.entity';
import { User } from '../users/entities/user.entity';
import { TicketStatus } from './enums/ticket-status.enum';
import { TicketSender } from './enums/ticket-sender.enum';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { MailingService } from '../mailing/mailing.service';
import { Role } from '../../common/enums/role.enum';

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'royalgames2025@gmail.com';
const AUTO_REPLY_TEXT =
  'Hemos recibido tu consulta. Nuestro equipo de soporte la está revisando y te responderá a la brevedad. Podés seguir el estado de tu ticket desde esta misma sección.';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectRepository(SupportTicket)
    private ticketRepository: Repository<SupportTicket>,
    @InjectRepository(SupportTicketMessage)
    private messageRepository: Repository<SupportTicketMessage>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private mailingService: MailingService,
  ) {}

  private async findTicketOrThrow(ticketId: string): Promise<SupportTicket> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  private assertCanAccess(ticket: SupportTicket, requester: any): void {
    if (ticket.userId !== requester.id && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('Cannot access another user\'s ticket');
    }
  }

  async createTicket(userId: string, dto: CreateTicketDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const ticket = await this.ticketRepository.save(
      this.ticketRepository.create({ userId, subject: dto.subject, status: TicketStatus.OPEN }),
    );

    await this.messageRepository.save([
      this.messageRepository.create({
        ticketId: ticket.id,
        senderId: userId,
        senderRole: TicketSender.USER,
        content: dto.message,
      }),
      this.messageRepository.create({
        ticketId: ticket.id,
        senderId: null,
        senderRole: TicketSender.SYSTEM,
        content: AUTO_REPLY_TEXT,
      }),
    ]);

    this.mailingService
      .sendMail({
        to: SUPPORT_EMAIL,
        subject: `[Ticket] ${dto.subject}`,
        html: `
          <h2>Nuevo ticket de soporte</h2>
          <p><strong>Usuario:</strong> ${user.nick} (${user.email})</p>
          <p><strong>Asunto:</strong> ${dto.subject}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${dto.message}</p>
        `,
      })
      .catch((err) => this.logger.error('Failed to send ticket notification email', err));

    return this.getTicketDetail(ticket.id, { id: userId, role: user.role });
  }

  async addMessage(ticketId: string, requester: any, content: string) {
    const ticket = await this.findTicketOrThrow(ticketId);
    this.assertCanAccess(ticket, requester);

    const isAdminReply = requester.role === Role.ADMIN;
    const senderRole = isAdminReply ? TicketSender.ADMIN : TicketSender.USER;

    await this.messageRepository.save(
      this.messageRepository.create({
        ticketId,
        senderId: requester.id,
        senderRole,
        content,
      }),
    );

    ticket.status = isAdminReply ? TicketStatus.ANSWERED : TicketStatus.OPEN;
    await this.ticketRepository.save(ticket);

    if (!isAdminReply) {
      const user = await this.usersRepository.findOne({ where: { id: ticket.userId } });
      this.mailingService
        .sendMail({
          to: SUPPORT_EMAIL,
          subject: `[Ticket] Nueva respuesta: ${ticket.subject}`,
          html: `
            <h2>Nueva respuesta de usuario en un ticket</h2>
            <p><strong>Usuario:</strong> ${user?.nick ?? ticket.userId}</p>
            <p><strong>Asunto:</strong> ${ticket.subject}</p>
            <p><strong>Mensaje:</strong></p>
            <p>${content}</p>
          `,
        })
        .catch((err) => this.logger.error('Failed to send ticket reply notification email', err));
    }

    return this.getTicketDetail(ticketId, requester);
  }

  async updateStatus(ticketId: string, status: TicketStatus) {
    const ticket = await this.findTicketOrThrow(ticketId);
    ticket.status = status;
    await this.ticketRepository.save(ticket);
    return ticket;
  }

  async listMyTickets(userId: string) {
    return this.ticketRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async listAllTickets() {
    return this.ticketRepository.query(`
      SELECT t.*, u.nick AS "userNick"
      FROM support_tickets t
      JOIN users u ON u.id = t."userId"
      ORDER BY t."updatedAt" DESC
    `);
  }

  async getTicketDetail(ticketId: string, requester: any) {
    const ticket = await this.findTicketOrThrow(ticketId);
    this.assertCanAccess(ticket, requester);

    const messages = await this.messageRepository.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });

    return { ticket, messages };
  }
}
