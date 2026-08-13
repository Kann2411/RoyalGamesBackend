import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './dtos/send-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Send a friend request by nick' })
  async sendRequest(@Body() dto: SendFriendRequestDto, @CurrentUser() user: any) {
    return this.friendsService.sendRequest(user.id, dto.nick);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept an incoming friend request' })
  @ApiParam({ name: 'id', description: 'Friendship UUID' })
  async accept(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: any) {
    return this.friendsService.acceptRequest(user.id, id);
  }

  @Patch(':id/decline')
  @ApiOperation({ summary: 'Decline an incoming friend request' })
  @ApiParam({ name: 'id', description: 'Friendship UUID' })
  async decline(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: any) {
    return this.friendsService.declineRequest(user.id, id);
  }

  @Delete(':id/cancel')
  @ApiOperation({ summary: 'Cancel an outgoing friend request' })
  @ApiParam({ name: 'id', description: 'Friendship UUID' })
  async cancel(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: any) {
    await this.friendsService.cancelRequest(user.id, id);
    return { message: 'Request cancelled' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove an existing friend' })
  @ApiParam({ name: 'id', description: 'Friendship UUID' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: any) {
    await this.friendsService.removeFriend(user.id, id);
    return { message: 'Friend removed' };
  }

  @Get()
  @ApiOperation({ summary: 'List my accepted friends' })
  async list(@CurrentUser() user: any) {
    return this.friendsService.listFriends(user.id);
  }

  @Get('requests/incoming')
  @ApiOperation({ summary: 'List pending requests sent to me' })
  async incoming(@CurrentUser() user: any) {
    return this.friendsService.listIncomingPending(user.id);
  }

  @Get('requests/outgoing')
  @ApiOperation({ summary: 'List pending requests I sent' })
  async outgoing(@CurrentUser() user: any) {
    return this.friendsService.listOutgoingPending(user.id);
  }

  @Get('relationship/:userId')
  @ApiOperation({ summary: 'Get my relationship status with another user' })
  @ApiParam({ name: 'userId', description: 'Target user UUID' })
  async relationship(@Param('userId', new ParseUUIDPipe()) userId: string, @CurrentUser() user: any) {
    return this.friendsService.getRelationship(user.id, userId);
  }
}
