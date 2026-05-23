import { IsEmail, IsString, MinLength, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'player123', description: 'User nickname' })
  @IsString()
  nick: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'male', description: 'User gender' })
  @IsString()
  sexo: string;

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
}
