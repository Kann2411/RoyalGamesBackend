import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

const extractTokenFromRequest = (req: Request): string | null => {
  if (!req) {
    return null;
  }

  const authHeader = req.headers?.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  if (req.query && typeof req.query.token === 'string') {
    return req.query.token;
  }

  if (req.body && typeof req.body.token === 'string') {
    return req.body.token;
  }

  const xAccessToken = req.headers?.['x-access-token'];
  if (typeof xAccessToken === 'string') {
    return xAccessToken;
  }

  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
        extractTokenFromRequest,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'royal-secret-key',
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      nick: payload.nick,
    };
  }
}
