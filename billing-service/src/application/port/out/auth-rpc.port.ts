export type AuthUserProfile = {
  id: string;
  email: string;
  vehicleModel: string;
  batteryKwh: number;
  isBlocked: boolean;
};

export abstract class AuthRpcPort {
  abstract getProfile(userId: string): Promise<AuthUserProfile>;
}
