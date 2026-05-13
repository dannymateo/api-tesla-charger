export abstract class JwtTokenPort {
  abstract signAccessToken(payload: { sub: string; email: string; role: string }): string;
}
