import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'player123', description: 'Nick of the message recipient' })
  @IsString()
  @IsNotEmpty()
  recipientNick: string;

  @ApiProperty({ example: 'Hola, quieres jugar?', description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
