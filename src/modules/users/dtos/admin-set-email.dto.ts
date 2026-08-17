import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminSetEmailDto {
  @ApiProperty({ example: 'newemail@example.com', description: 'New email for the user' })
  @IsEmail()
  email: string;
}
