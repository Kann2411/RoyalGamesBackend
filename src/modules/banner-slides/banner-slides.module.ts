import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannerSlide } from './entities/banner-slide.entity';
import { BannerSlidesController } from './banner-slides.controller';
import { BannerSlidesService } from './banner-slides.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

@Module({
  imports: [TypeOrmModule.forFeature([BannerSlide])],
  controllers: [BannerSlidesController],
  providers: [BannerSlidesService, CloudinaryService],
})
export class BannerSlidesModule {}
