import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard, but never blocks the request. If a valid Bearer token is present,
 * `request.user` is populated (readable via @CurrentUser()); otherwise `request.user`
 * is simply undefined and the request proceeds anyway. Used on endpoints that must stay
 * reachable by unauthenticated callers (e.g. the external iframe-hosted games settling
 * bets via the chips endpoints) while still letting us recognize authenticated admins.
 */
@Injectable()
export class OptionalJwtAuthGuard extends PassportAuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest(err: any, user: any) {
    return user || undefined;
  }
}
