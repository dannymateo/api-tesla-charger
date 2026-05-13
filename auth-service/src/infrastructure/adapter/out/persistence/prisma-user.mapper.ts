import { User as PrismaUser } from '@prisma/client';
import { parseUserRole } from '../../../../domain/enum/user-role.enum';
import { User } from '../../../../domain/model/user';

export function toDomainUser(record: PrismaUser): User {
  return User.reconstitute({
    id: record.id,
    email: record.email,
    passwordHash: record.passwordHash,
    role: parseUserRole(record.role),
    vehicleModel: record.vehicleModel,
    batteryKwh: record.batteryKwh,
    isBlocked: record.isBlocked,
    createdAt: record.createdAt,
  });
}
