import { IsString, IsOptional, IsNumber, IsUUID, Min } from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  username: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  chips?: number;
}
