import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteContentBlock } from './entities/site-content-block.entity';
import { SiteContentController } from './site-content.controller';
import { SiteContentService } from './site-content.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

@Module({
  imports: [TypeOrmModule.forFeature([SiteContentBlock])],
  controllers: [SiteContentController],
  providers: [SiteContentService, CloudinaryService],
})
export class SiteContentModule {}
