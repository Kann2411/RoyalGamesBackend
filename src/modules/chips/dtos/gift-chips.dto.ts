import { IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GiftChipsDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Recipient user ID' })
  @IsUUID()
  toUserId: string;

  @ApiProperty({ example: 1000, description: 'Chips to gift' })
  @IsInt()
  @Min(1)
  amount: number;
}
