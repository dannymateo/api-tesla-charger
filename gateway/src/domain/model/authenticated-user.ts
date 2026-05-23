import { UserRole } from '../enum/user-role.enum';

export class AuthenticatedUser {
  private constructor(
    readonly sub: string,
    readonly email: string,
    readonly role: UserRole,
  ) {}

  static fromTokenPayload(payload: { sub: string; email: string; role: string }): AuthenticatedUser {
    if (!payload.sub?.trim()) {
      throw new Error('Token subject is required');
    }
    if (!payload.email?.trim()) {
      throw new Error('Token email is required');
    }
    const role = payload.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER;
    return new AuthenticatedUser(payload.sub, payload.email, role);
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }
}
