import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MinesRound } from './entities/mines-round.entity';
import { User } from '../users/entities/user.entity';
import { ChipsAward } from '../chips/entities/chips-award.entity';
import { MinesController } from './mines.controller';
import { MinesService } from './mines.service';
import { MinesSessionGuard } from '../../common/guards/mines-session.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([MinesRound, User, ChipsAward]),
    // AuthModule only exports AuthService (not JwtModule), so this module registers its own
    // JwtService against the same JWT_SECRET to sign/verify Mines session tokens.
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'royal-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [MinesController],
  providers: [MinesService, MinesSessionGuard],
})
export class MinesModule {}
