import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGameDto {
  @ApiProperty({ example: 'Chess Masters', description: 'Game name' })
  @IsString()
  name: string;
}
