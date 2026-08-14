import { Controller, Get, Post, Delete, Param, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BlocksService } from './blocks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Blocks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('blocks')
export class BlocksController {
  constructor(private blocksService: BlocksService) {}

  @Post(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block a user' })
  @ApiParam({ name: 'userId', description: 'Target user UUID' })
  async block(@Param('userId', new ParseUUIDPipe()) userId: string, @CurrentUser() user: any) {
    await this.blocksService.blockUser(user.id, userId);
    return { message: 'User blocked' };
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiParam({ name: 'userId', description: 'Target user UUID' })
  async unblock(@Param('userId', new ParseUUIDPipe()) userId: string, @CurrentUser() user: any) {
    await this.blocksService.unblockUser(user.id, userId);
    return { message: 'User unblocked' };
  }

  @Get('status/:userId')
  @ApiOperation({ summary: 'Check whether I have blocked this user' })
  @ApiParam({ name: 'userId', description: 'Target user UUID' })
  async status(@Param('userId', new ParseUUIDPipe()) userId: string, @CurrentUser() user: any) {
    return this.blocksService.getStatus(user.id, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List users I have blocked' })
  async list(@CurrentUser() user: any) {
    return this.blocksService.listBlocked(user.id);
  }
}
