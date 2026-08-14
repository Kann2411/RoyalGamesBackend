import { Controller, Get, Post, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PrizesService } from './prizes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { PrizePeriod } from '../chips/entities/prize-award.entity';

function parsePeriod(period: string): PrizePeriod {
  if (period !== 'weekly' && period !== 'monthly') {
    throw new BadRequestException('Period must be "weekly" or "monthly"');
  }
  return period;
}

@ApiTags('Prizes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/prizes')
export class PrizesController {
  constructor(private prizesService: PrizesService) {}

  @Get(':period/preview')
  @ApiOperation({ summary: 'Preview the current top 5 for a period without awarding (Admin only)' })
  @ApiParam({ name: 'period', enum: ['weekly', 'monthly'] })
  async preview(@Param('period') period: string) {
    return this.prizesService.getPreview(parsePeriod(period));
  }

  @Post(':period/award')
  @ApiOperation({ summary: 'Award the current top 5 for a period (Admin only)' })
  @ApiParam({ name: 'period', enum: ['weekly', 'monthly'] })
  async award(@Param('period') period: string) {
    return this.prizesService.award(parsePeriod(period));
  }
}
