import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from '../enums/ticket-status.enum';

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: [TicketStatus.OPEN, TicketStatus.CLOSED], example: TicketStatus.CLOSED })
  @IsEnum([TicketStatus.OPEN, TicketStatus.CLOSED])
  status: TicketStatus.OPEN | TicketStatus.CLOSED;
}
