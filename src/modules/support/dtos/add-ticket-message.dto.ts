import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddTicketMessageDto {
  @ApiProperty({ example: 'Gracias, ya lo revisamos y fue resuelto.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;
}
