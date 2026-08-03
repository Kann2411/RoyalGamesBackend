import { IsUUID, IsOptional, IsArray } from 'class-validator';

export class CreateCardDto {
  @IsUUID()
  playerId: string;

  @IsOptional()
  @IsArray()
  numbers?: number[];
}
