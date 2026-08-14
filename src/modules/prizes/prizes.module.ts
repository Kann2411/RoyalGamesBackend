import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChipsAward } from '../chips/entities/chips-award.entity';
import { PrizeAward } from '../chips/entities/prize-award.entity';
import { User } from '../users/entities/user.entity';
import { PrizesController } from './prizes.controller';
import { PrizesService } from './prizes.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChipsAward, PrizeAward, User])],
  controllers: [PrizesController],
  providers: [PrizesService],
})
export class PrizesModule {}
