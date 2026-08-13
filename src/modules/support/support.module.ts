import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from './entities/support-ticket.entity';
import { SupportTicketMessage } from './entities/support-ticket-message.entity';
import { User } from '../users/entities/user.entity';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { MailingModule } from '../mailing/mailing.module';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket, SupportTicketMessage, User]), MailingModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
