import { IsUUID, IsOptional, IsObject } from 'class-validator';

export class CreateGameDto {
  @IsUUID()
  roomId: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
