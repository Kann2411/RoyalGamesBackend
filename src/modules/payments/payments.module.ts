import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pay } from './entities/pay.entity';
import { User } from '../users/entities/user.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './repositories/payments.repository';
import { MercadoPagoRepository } from './repositories/mercadopago.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Pay, User])],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, MercadoPagoRepository],
  exports: [PaymentsService, PaymentsRepository, MercadoPagoRepository],
})
export class PaymentsModule {}
