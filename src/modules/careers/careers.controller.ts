import { Controller, Post, Body, UploadedFile, UseInterceptors, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { CareersService } from './careers.service';
import { SubmitApplicationDto } from './dtos/submit-application.dto';

@ApiTags('Careers')
@Controller('careers')
export class CareersController {
  constructor(private careersService: CareersService) {}

  // Public and unauthenticated on purpose: applicants don't need — and often won't have —
  // a platform account to apply for a job.
  @Post('apply')
  @UseInterceptors(FileInterceptor('cv', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a job application with a CV attachment' })
  async apply(@Body() dto: SubmitApplicationDto, @UploadedFile() cv?: Express.Multer.File) {
    return this.careersService.submitApplication(dto, cv);
  }
}
