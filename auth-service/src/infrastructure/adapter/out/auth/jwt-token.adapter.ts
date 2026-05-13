import { Injectable } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { JwtTokenPort } from '../../../../application/port/out/jwt-token.port';

@Injectable()
export class JwtTokenAdapter extends JwtTokenPort {
  signAccessToken(payload: { sub: string; email: string; role: string }): string {
    return sign(payload, process.env.JWT_SECRET ?? 'change_me', { expiresIn: '2h' });
  }
}
