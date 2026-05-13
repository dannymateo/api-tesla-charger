import { CreateUserData, User } from '../../../domain/model/user';
import { UserRole } from '../../../domain/enum/user-role.enum';

export type UpdateUserData = {
  vehicleModel?: string;
  batteryKwh?: number;
  isBlocked?: boolean;
};

export abstract class UserRepositoryPort {
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findById(id: string): Promise<User | null>;
  abstract create(data: CreateUserData): Promise<User>;
  abstract update(id: string, data: UpdateUserData): Promise<User>;
  abstract findBlockedUsers(): Promise<User[]>;
}

export { UserRole };
