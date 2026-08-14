import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGuestTicketDto {
  @ApiProperty({ example: 'Juan Pérez', description: 'Guest name' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'juan@example.com', description: 'Guest email (used to reply)' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'No puedo cargar fichas', description: 'Ticket subject' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: 'Intenté pagar con PayPal y...', description: 'Ticket message' })
  @IsString()
  @MinLength(5)
  message: string;
}
