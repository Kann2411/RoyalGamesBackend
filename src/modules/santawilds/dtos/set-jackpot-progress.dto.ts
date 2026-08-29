import { IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetJackpotProgressDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 100, description: 'Precio de la apuesta (el tier al que pertenece este contador)' })
  @IsInt()
  @Min(1)
  betAmount: number;

  @ApiProperty({ example: 42, description: 'Cantidad de símbolos JACKPOT acumulados para ese precio de apuesta' })
  @IsInt()
  @Min(0)
  progress: number;
}
