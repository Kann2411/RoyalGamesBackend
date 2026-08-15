import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from './entities/support-ticket.entity';
import { SupportTicketMessage } from './entities/support-ticket-message.entity';
import { User } from '../users/entities/user.entity';
import { TicketStatus } from './enums/ticket-status.enum';
import { TicketSender } from './enums/ticket-sender.enum';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { CreateGuestTicketDto } from './dtos/create-guest-ticket.dto';
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
    const isAgent = requester.role === Role.ADMIN || requester.role === Role.MOD;
    if (ticket.userId !== requester.id && !isAgent) {
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

  async createGuestTicket(dto: CreateGuestTicketDto) {
    const ticket = await this.ticketRepository.save(
      this.ticketRepository.create({
        userId: null,
        guestName: dto.name,
        guestEmail: dto.email,
        subject: dto.subject,
        status: TicketStatus.OPEN,
      }),
    );

    await this.messageRepository.save([
      this.messageRepository.create({
        ticketId: ticket.id,
        senderId: null,
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
          <h2>Nuevo ticket de soporte (visitante sin cuenta)</h2>
          <p><strong>Nombre:</strong> ${dto.name} (${dto.email})</p>
          <p><strong>Asunto:</strong> ${dto.subject}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${dto.message}</p>
        `,
      })
      .catch((err) => this.logger.error('Failed to send guest ticket notification email', err));

    this.mailingService
      .sendMail({
        to: dto.email,
        subject: `[RoyalGames] Recibimos tu consulta: ${dto.subject}`,
        html: `
          <p>Hola ${dto.name},</p>
          <p>${AUTO_REPLY_TEXT}</p>
          <p>Te responderemos a este mismo correo.</p>
        `,
      })
      .catch((err) => this.logger.error('Failed to send guest confirmation email', err));

    return { message: 'Ticket created', ticketId: ticket.id };
  }

  async addMessage(ticketId: string, requester: any, content: string) {
    const ticket = await this.findTicketOrThrow(ticketId);
    this.assertCanAccess(ticket, requester);

    // "Admin" here means "support agent" (admin or mod) for message-sender/status purposes —
    // there's no separate sender enum value for mods, they reply under the same "Soporte" label.
    const isAdminReply = requester.role === Role.ADMIN || requester.role === Role.MOD;
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
      const user = ticket.userId ? await this.usersRepository.findOne({ where: { id: ticket.userId } }) : null;
      this.mailingService
        .sendMail({
          to: SUPPORT_EMAIL,
          subject: `[Ticket] Nueva respuesta: ${ticket.subject}`,
          html: `
            <h2>Nueva respuesta de usuario en un ticket</h2>
            <p><strong>Usuario:</strong> ${user?.nick ?? ticket.guestName ?? ticket.userId}</p>
            <p><strong>Asunto:</strong> ${ticket.subject}</p>
            <p><strong>Mensaje:</strong></p>
            <p>${content}</p>
          `,
        })
        .catch((err) => this.logger.error('Failed to send ticket reply notification email', err));
    } else if (!ticket.userId && ticket.guestEmail) {
      // Guest tickets have no in-app way to see the reply — email is the only channel.
      this.mailingService
        .sendMail({
          to: ticket.guestEmail,
          subject: `[RoyalGames] Respuesta a tu consulta: ${ticket.subject}`,
          html: `
            <p>Hola ${ticket.guestName ?? ''},</p>
            <p>Nuestro equipo de soporte respondió tu consulta:</p>
            <p>${content}</p>
          `,
        })
        .catch((err) => this.logger.error('Failed to send guest ticket reply email', err));
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
      SELECT t.*, COALESCE(u.nick, t."guestName") AS "userNick", (t."userId" IS NULL) AS "isGuest"
      FROM support_tickets t
      LEFT JOIN users u ON u.id = t."userId"
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
