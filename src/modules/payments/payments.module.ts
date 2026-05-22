import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pay } from './entities/pay.entity';
import { User } from '../users/entities/user.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './repositories/payments.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Pay, User])],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
  exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
