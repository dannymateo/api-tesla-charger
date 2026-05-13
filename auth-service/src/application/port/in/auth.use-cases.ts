import { PublicUser } from '../../../domain/model/public-user';

export interface IRegisterUseCase {
  register(input: {
    email: string;
    password: string;
    vehicleModel: string;
    batteryKwh: number;
  }): Promise<PublicUser>;
}

export interface ILoginUseCase {
  login(input: { email: string; password: string }): Promise<{
    accessToken: string;
    user: PublicUser;
  }>;
}

export interface IGetProfileUseCase {
  getProfile(userId: string): Promise<PublicUser>;
}

export interface IUpdateProfileUseCase {
  updateProfile(
    userId: string,
    input: { vehicleModel?: string; batteryKwh?: number },
  ): Promise<PublicUser>;
}

export interface IListUsersOverdueUseCase {
  listUsersWithOverdueDebt(): Promise<PublicUser[]>;
}

export interface IIsUserBlockedUseCase {
  isUserBlocked(userId: string): Promise<{ isBlocked: boolean }>;
}

export interface IHandleInvoicesPaidUseCase {
  handleInvoicesPaid(payload: {
    userId: string;
    hasRemainingOverdue: boolean;
  }): Promise<{ unblocked: boolean; reason?: string }>;
}

export interface IBlockUserForOverdueUseCase {
  blockUserForOverdueDebt(userId: string): Promise<{ updated: boolean; reason?: string }>;
}
