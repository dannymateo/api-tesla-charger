import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { verify } from 'jsonwebtoken';
import { AuthenticatedUser } from '../../../../../../domain/model/authenticated-user';

type RequestWithUser = Request & { user?: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authorization.slice('Bearer '.length);
    try {
      const decoded = verify(token, process.env.JWT_SECRET ?? 'change_me') as {
        sub: string;
        email: string;
        role: string;
      };
      request.user = AuthenticatedUser.fromTokenPayload(decoded);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
