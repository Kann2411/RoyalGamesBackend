import { IsEnum, IsOptional, IsString, IsInt, Min, Max, IsObject } from 'class-validator';
import { BingoRoomType } from '../entities/bingo-room.entity';

export class CreateRoomDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(BingoRoomType)
  type?: BingoRoomType;

  @IsOptional()
  @IsInt()
  @Min(0)
  betAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxPlayers?: number;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
