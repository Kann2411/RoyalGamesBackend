import { IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAvatarDto {
  @ApiProperty({ example: { theme: 'dark' }, description: 'Avatar JSON data', required: false })
  @IsOptional()
  @IsObject()
  avatarData?: any;
}
