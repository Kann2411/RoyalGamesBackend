import { Controller, Get, Post, Patch, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { AddTicketMessageDto } from './dtos/add-ticket-message.dto';
import { UpdateTicketStatusDto } from './dtos/update-ticket-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Open a new support ticket' })
  async createTicket(@Body() dto: CreateTicketDto, @CurrentUser() user: any) {
    return this.supportService.createTicket(user.id, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List my own support tickets' })
  async listMyTickets(@CurrentUser() user: any) {
    return this.supportService.listMyTickets(user.id);
  }

  @Get('tickets/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List every support ticket (Admin only)' })
  async listAllTickets() {
    return this.supportService.listAllTickets();
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get a ticket and its messages (owner or admin)' })
  async getTicket(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: any) {
    return this.supportService.getTicketDetail(id, user);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Reply to a ticket (owner or admin)' })
  async addMessage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddTicketMessageDto,
    @CurrentUser() user: any,
  ) {
    return this.supportService.addMessage(id, user, dto.content);
  }

  @Patch('tickets/:id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Open or close a ticket (Admin only)' })
  async updateStatus(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.supportService.updateStatus(id, dto.status);
  }
}
