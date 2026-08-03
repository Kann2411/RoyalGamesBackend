import { IsUUID, IsOptional, IsObject } from 'class-validator';

export class CreateGameDto {
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
