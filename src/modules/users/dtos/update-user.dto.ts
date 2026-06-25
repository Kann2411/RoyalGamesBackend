import { IsEmail, IsString, MinLength, IsOptional, IsInt, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ example: 'player123', description: 'User nickname', required: false })
  @IsOptional()
  @IsString()
  nick?: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 25, description: 'User age', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  age?: number;

  @ApiProperty({ example: 'Mexico', description: 'User country', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'Fun player', description: 'User description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'avatar_url', description: 'Avatar URL', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ example: 'image_url', description: 'Image URL', required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ example: { theme: 'dark' }, description: 'Avatar JSON data', required: false })
  @IsOptional()
  @IsObject()
  avatarData?: any;
}
