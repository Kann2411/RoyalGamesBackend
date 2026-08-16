import { IsIn, IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FIXED_BET_VALUES, MAX_MINES_COUNT, MIN_MINES_COUNT } from '../constants/fixed-bet-values';

export class StartRoundDto {
  @ApiProperty({ example: 250, description: 'Must be one of the fixed bet ladder values' })
  @IsIn(FIXED_BET_VALUES)
  betAmount: number;

  @ApiProperty({ example: 5, minimum: MIN_MINES_COUNT, maximum: MAX_MINES_COUNT })
  @IsInt()
  @Min(MIN_MINES_COUNT)
  @Max(MAX_MINES_COUNT)
  minesCount: number;
}
