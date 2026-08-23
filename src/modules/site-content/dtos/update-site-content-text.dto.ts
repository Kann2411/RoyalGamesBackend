import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSiteContentTextDto {
  @ApiProperty({ example: 'La mejor pagina de juegos' })
  @IsString()
  @MaxLength(5000)
  text: string;
}
