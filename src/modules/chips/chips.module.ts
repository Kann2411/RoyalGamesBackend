import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { ChipsController } from './chips.controller';
import { ChipsService } from './chips.service';
import { ChipsRepository } from './repositories/chips.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [ChipsController],
  providers: [ChipsService, ChipsRepository],
  exports: [ChipsService, ChipsRepository],
})
export class ChipsModule {}
