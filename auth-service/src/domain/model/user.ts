import { DomainValidationError } from '../error/domain-validation.error';
import { UserRole } from '../enum/user-role.enum';

export type CreateUserData = {
  email: string;
  passwordHash: string;
  role: UserRole;
  vehicleModel: string;
  batteryKwh: number;
  isBlocked: boolean;
};

export class User {
  private constructor(
    readonly id: string,
    readonly email: string,
    readonly passwordHash: string,
    readonly role: UserRole,
    readonly vehicleModel: string,
    readonly batteryKwh: number,
    readonly isBlocked: boolean,
    readonly createdAt: Date,
  ) {}

  static normalizeEmail(email: string): string {
    return User.validateEmail(email);
  }

  static createNew(input: CreateUserData): CreateUserData {
    return {
      email: User.validateEmail(input.email),
      passwordHash: User.validatePasswordHash(input.passwordHash),
      role: input.role,
      vehicleModel: User.validateVehicleModel(input.vehicleModel),
      batteryKwh: User.validateBatteryKwh(input.batteryKwh),
      isBlocked: input.isBlocked,
    };
  }

  static reconstitute(props: {
    id: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    vehicleModel: string;
    batteryKwh: number;
    isBlocked: boolean;
    createdAt: Date;
  }): User {
    return new User(
      props.id,
      props.email,
      props.passwordHash,
      props.role,
      props.vehicleModel,
      props.batteryKwh,
      props.isBlocked,
      props.createdAt,
    );
  }

  withProfileUpdate(input: { vehicleModel?: string; batteryKwh?: number }): Pick<User, 'vehicleModel' | 'batteryKwh'> {
    return {
      vehicleModel: input.vehicleModel !== undefined ? User.validateVehicleModel(input.vehicleModel) : this.vehicleModel,
      batteryKwh: input.batteryKwh !== undefined ? User.validateBatteryKwh(input.batteryKwh) : this.batteryKwh,
    };
  }

  withBlocked(isBlocked: boolean): Pick<User, 'isBlocked'> {
    return { isBlocked };
  }

  private static validateEmail(email: string): string {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) {
      throw new DomainValidationError('Email is required');
    }
    return normalized;
  }

  private static validatePasswordHash(passwordHash: string): string {
    if (!passwordHash?.trim()) {
      throw new DomainValidationError('Password hash is required');
    }
    return passwordHash;
  }

  private static validateVehicleModel(vehicleModel: string): string {
    if (!vehicleModel?.trim()) {
      throw new DomainValidationError('Vehicle model is required');
    }
    return vehicleModel.trim();
  }

  private static validateBatteryKwh(batteryKwh: number): number {
    if (batteryKwh <= 0) {
      throw new DomainValidationError('Battery capacity must be greater than zero');
    }
    return batteryKwh;
  }
}
