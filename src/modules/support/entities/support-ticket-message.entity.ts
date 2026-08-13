import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SupportTicket } from './support-ticket.entity';
import { TicketSender } from '../enums/ticket-sender.enum';

@Entity('support_ticket_messages')
export class SupportTicketMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticketId: string;

  @Column({ type: 'uuid', nullable: true })
  senderId: string | null;

  @Column({ type: 'enum', enum: TicketSender })
  senderRole: TicketSender;

  @Column({ type: 'varchar', length: 4000 })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => SupportTicket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: SupportTicket;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'senderId' })
  sender: User;
}
