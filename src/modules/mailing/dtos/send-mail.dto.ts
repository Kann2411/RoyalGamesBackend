import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMailDto {
  @ApiProperty({ example: 'user@example.com', description: 'Recipient email' })
  @IsEmail()
  to: string;

  @ApiProperty({ example: 'Welcome!', description: 'Email subject' })
  @IsString()
  subject: string;

  @ApiProperty({ example: 'Welcome to Royal Games!', description: 'Email body' })
  @IsString()
  html: string;
}
