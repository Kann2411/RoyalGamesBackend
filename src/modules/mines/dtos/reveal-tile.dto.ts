import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MINES_TILE_COUNT } from '../constants/fixed-bet-values';

export class RevealTileDto {
  @ApiProperty()
  @IsUUID()
  roundId: string;

  @ApiProperty({ minimum: 0, maximum: MINES_TILE_COUNT - 1 })
  @IsInt()
  @Min(0)
  @Max(MINES_TILE_COUNT - 1)
  tileIndex: number;
}
