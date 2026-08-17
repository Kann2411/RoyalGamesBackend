import { Module } from '@nestjs/common';
import { MailingModule } from '../mailing/mailing.module';
import { CareersController } from './careers.controller';
import { CareersService } from './careers.service';

@Module({
  imports: [MailingModule],
  controllers: [CareersController],
  providers: [CareersService],
})
export class CareersModule {}
