import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dtos/send-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a direct message to another user by nick' })
  async send(@Body() dto: SendMessageDto, @CurrentUser() user: any) {
    return this.messagesService.sendMessage(user.id, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List my conversations with last message + unread count' })
  async conversations(@CurrentUser() user: any) {
    return this.messagesService.getConversations(user.id);
  }

  @Get('thread/:userId')
  @ApiOperation({ summary: 'Get my message thread with another user (marks it as read)' })
  @ApiParam({ name: 'userId', description: 'Other user UUID' })
  @ApiQuery({ name: 'limit', required: false })
  async thread(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CurrentUser() user: any,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.messagesService.getThread(user.id, userId, limit || 50);
  }

  @Patch('thread/:userId/read')
  @ApiOperation({ summary: 'Mark my thread with another user as read' })
  @ApiParam({ name: 'userId', description: 'Other user UUID' })
  async markRead(@Param('userId', new ParseUUIDPipe()) userId: string, @CurrentUser() user: any) {
    await this.messagesService.markThreadRead(user.id, userId);
    return { message: 'Thread marked as read' };
  }
}
