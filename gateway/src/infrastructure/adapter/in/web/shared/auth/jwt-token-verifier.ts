import { Injectable, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { AuthenticatedUser } from '../../../../../../domain/model/authenticated-user';

@Injectable()
export class JwtTokenVerifier {
  verify(token: string): AuthenticatedUser {
    try {
      const decoded = verify(token, process.env.JWT_SECRET ?? 'change_me') as {
        sub: string;
        email: string;
        role: string;
      };
      return AuthenticatedUser.fromTokenPayload(decoded);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
