import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SantaWildsController } from './santawilds.controller';
import { SantaWildsService } from './santawilds.service';
import { SantaWildsJackpotProgress } from './entities/jackpot-progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SantaWildsJackpotProgress])],
  controllers: [SantaWildsController],
  providers: [SantaWildsService],
})
export class SantaWildsModule {}
