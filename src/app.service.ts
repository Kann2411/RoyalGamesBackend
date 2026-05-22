import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '🎮 Royal Games API v2.0 - Running on NestJS';
  }

  health(): { status: string; version: string } {
    return {
      status: 'OK',
      version: '2.0.0',
    };
  }
}
