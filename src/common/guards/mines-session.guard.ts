import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Gates the Mines gameplay endpoints (start/reveal/cashout). Unlike OptionalJwtAuthGuard
 * (used by the raw add/remove chips endpoints), this always blocks: it only accepts a
 * short-lived token minted by `POST games/mines/session-token` (scope: 'mines'), never a
 * raw userId from the request body. This is what stops someone who merely knows another
 * player's UUID from starting/draining rounds on their behalf.
 */
@Injectable()
export class MinesSessionGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing Mines session token');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired Mines session token');
    }

    if (payload?.scope !== 'mines' || !payload?.sub) {
      throw new UnauthorizedException('Token is not a valid Mines session token');
    }

    request.user = { id: payload.sub };
    return true;
  }
}
