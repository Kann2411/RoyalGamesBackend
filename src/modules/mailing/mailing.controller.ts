import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { MailingService } from './mailing.service';
import { SendMailDto } from './dtos/send-mail.dto';

@ApiTags('Mailing')
@Controller('mailing')
export class MailingController {
  constructor(private mailingService: MailingService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send email' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  @ApiResponse({ status: 400, description: 'Failed to send email' })
  async sendMail(@Body() sendMailDto: SendMailDto) {
    return this.mailingService.sendMail(sendMailDto);
  }
}
