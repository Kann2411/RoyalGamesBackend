import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminSetDescriptionDto {
  @ApiProperty({ example: 'Jugador desde 2023, le gusta el bingo.', description: "New description for the user's profile" })
  @IsString()
  @MaxLength(500)
  description: string;
}
