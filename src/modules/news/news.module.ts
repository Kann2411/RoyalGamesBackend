import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsArticle } from './entities/news-article.entity';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

@Module({
  imports: [TypeOrmModule.forFeature([NewsArticle])],
  controllers: [NewsController],
  providers: [NewsService, CloudinaryService],
})
export class NewsModule {}
