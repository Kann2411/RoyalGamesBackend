import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dtos/create-news.dto';
import { UpdateNewsDto } from './dtos/update-news.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

const imageInterceptor = FileInterceptor('image', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'List all news articles (public)' })
  async findAll() {
    return this.newsService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MOD)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a news article (Admin/Mod)' })
  @UseInterceptors(imageInterceptor)
  async create(
    @Body() dto: CreateNewsDto,
    @CurrentUser() user: { id: string },
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.newsService.create(dto, user.id, image);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MOD)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'News article UUID' })
  @ApiOperation({ summary: 'Edit a news article (Admin/Mod)' })
  @UseInterceptors(imageInterceptor)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateNewsDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.newsService.update(id, dto, image);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MOD)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'News article UUID' })
  @ApiOperation({ summary: 'Delete a news article (Admin/Mod)' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.newsService.remove(id);
    return { message: 'News article deleted successfully' };
  }
}
