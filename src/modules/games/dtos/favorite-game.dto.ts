import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FavoriteGameDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'Game ID' })
  @IsUUID()
  gameId: string;
}
