import {
  Controller,
  Put,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ChipsService } from './chips.service';
import { ChipsTransactionDto } from './dtos/chips-transaction.dto';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Chips')
@Controller()
export class ChipsController {
  constructor(private chipsService: ChipsService) {}

  // NOTE: intentionally NOT admin-only. The external iframe-hosted games (Minas, Pachinka,
  // Royal Joker — see ALLOWED_ORIGINS) settle bets/winnings by calling this endpoint directly
  // with no JWT (they only know the player's userId). OptionalJwtAuthGuard is used purely to
  // tag who made the call (admin vs. an anonymous game client) for the chips_awards ledger —
  // it never blocks the request.
  @Put('add/chips')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add chips to user (called by admins and by the external games)' })
  @ApiResponse({ status: 200, description: 'Chips added successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async addChips(@Body() chipsTransactionDto: ChipsTransactionDto, @CurrentUser() user: any) {
    const source = user?.role === Role.ADMIN ? 'admin' : 'game';
    return this.chipsService.addChips(chipsTransactionDto, source);
  }

  @Put('remove/chips')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove chips from user' })
  @ApiResponse({ status: 200, description: 'Chips removed successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient chips' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async removeChips(@Body() chipsTransactionDto: ChipsTransactionDto) {
    return this.chipsService.removeChips(chipsTransactionDto);
  }

  @Get('chips/:userId')
  @ApiOperation({ summary: 'Get user chips balance' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Chips retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getChips(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.chipsService.getChips(userId);
  }
}
