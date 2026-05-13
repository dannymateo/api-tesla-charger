import { UserRole } from '../enum/user-role.enum';
import { User } from './user';

export class PublicUser {
  private constructor(
    readonly id: string,
    readonly email: string,
    readonly role: UserRole,
    readonly vehicleModel: string,
    readonly batteryKwh: number,
    readonly isBlocked: boolean,
    readonly createdAt: string,
  ) {}

  static fromUser(user: User): PublicUser {
    return new PublicUser(
      user.id,
      user.email,
      user.role,
      user.vehicleModel,
      user.batteryKwh,
      user.isBlocked,
      user.createdAt.toISOString(),
    );
  }
}
