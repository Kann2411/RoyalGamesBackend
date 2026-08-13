import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ example: 'No recibí mis fichas' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: 'Cargué $10 y no me llegaron las fichas a la cuenta.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;
}
