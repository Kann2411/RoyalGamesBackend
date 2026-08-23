import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsArticle } from './entities/news-article.entity';
import { CreateNewsDto } from './dtos/create-news.dto';
import { UpdateNewsDto } from './dtos/update-news.dto';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

const ALLOWED_IMAGE_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsArticle)
    private readonly newsRepository: Repository<NewsArticle>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll(): Promise<NewsArticle[]> {
    return this.newsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateNewsDto, authorId: string, image?: Express.Multer.File): Promise<NewsArticle> {
    const article = this.newsRepository.create({ ...dto, authorId });

    if (image) {
      this.assertValidImage(image);
      const { url, publicId } = await this.cloudinaryService.uploadImage(image.buffer, 'news');
      article.imageUrl = url;
      article.imagePublicId = publicId;
    }

    return this.newsRepository.save(article);
  }

  async update(id: string, dto: UpdateNewsDto, image?: Express.Multer.File): Promise<NewsArticle> {
    const article = await this.newsRepository.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException('News article not found');
    }

    Object.assign(article, dto);

    if (image) {
      this.assertValidImage(image);
      const previousPublicId = article.imagePublicId;
      const { url, publicId } = await this.cloudinaryService.uploadImage(image.buffer, 'news');
      article.imageUrl = url;
      article.imagePublicId = publicId;
      if (previousPublicId) {
        await this.cloudinaryService.deleteImage(previousPublicId);
      }
    }

    return this.newsRepository.save(article);
  }

  async remove(id: string): Promise<void> {
    const article = await this.newsRepository.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException('News article not found');
    }
    if (article.imagePublicId) {
      await this.cloudinaryService.deleteImage(article.imagePublicId);
    }
    await this.newsRepository.remove(article);
  }

  private assertValidImage(file: Express.Multer.File): void {
    if (!ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('Formato de imagen no permitido. Usá JPG, PNG o WEBP.');
    }
  }
}
