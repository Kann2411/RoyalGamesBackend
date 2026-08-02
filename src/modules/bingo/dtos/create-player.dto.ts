import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  username: string;

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
