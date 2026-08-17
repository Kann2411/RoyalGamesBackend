import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CashoutDto {
  @ApiProperty()
  @IsUUID()
  roundId: string;
}
