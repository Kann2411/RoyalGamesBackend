import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminSetPasswordDto {
  @ApiProperty({ example: 'newPassword456', description: 'New password for the user' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
