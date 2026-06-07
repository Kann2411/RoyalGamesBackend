import { IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChipsTransactionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 100, description: 'Chips amount' })
  @IsNumber()
  @Min(1)
  removeChip: number;
}
