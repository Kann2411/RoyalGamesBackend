import {
  Controller,
  Put,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ChipsService } from './chips.service';
import { ChipsTransactionDto } from './dtos/chips-transaction.dto';

@ApiTags('Chips')
@Controller('chips')
export class ChipsController {
  constructor(private chipsService: ChipsService) {}

  @Put('add')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add chips to user' })
  @ApiResponse({ status: 200, description: 'Chips added successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async addChips(@Body() chipsTransactionDto: ChipsTransactionDto) {
    return this.chipsService.addChips(chipsTransactionDto);
  }

  @Put('remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove chips from user' })
  @ApiResponse({ status: 200, description: 'Chips removed successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient chips' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async removeChips(@Body() chipsTransactionDto: ChipsTransactionDto) {
    return this.chipsService.removeChips(chipsTransactionDto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user chips balance' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Chips retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getChips(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.chipsService.getChips(userId);
  }
}
