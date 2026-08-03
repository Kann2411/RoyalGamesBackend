import { IsUUID } from 'class-validator';

export class PlayerCardDto {
  @IsUUID()
  playerId: string;
}
