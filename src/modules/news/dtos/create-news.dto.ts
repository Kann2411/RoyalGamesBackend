import { IsString, MaxLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NEWS_TAGS, NewsTag } from '../entities/news-article.entity';

export class CreateNewsDto {
  @ApiProperty({ example: 'RoyalGames se lanza muy pronto' })
  @IsString()
  @MaxLength(200)
  titulo: string;

  @ApiProperty({ example: 'Estamos ultimando los últimos detalles...' })
  @IsString()
  @MaxLength(5000)
  texto: string;

  @ApiProperty({ example: 'Novedad', enum: NEWS_TAGS })
  @IsIn(NEWS_TAGS)
  tag: NewsTag;
}
