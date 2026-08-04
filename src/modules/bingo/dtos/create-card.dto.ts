import { IsUUID, IsOptional, IsArray, IsInt, Min, Max } from 'class-validator';

export class CreateCardDto {
  @IsUUID()
  playerId: string;

  @IsOptional()
  @IsArray()
  numbers?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  quantity?: number;
}
