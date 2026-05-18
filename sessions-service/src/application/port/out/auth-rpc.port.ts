export type AuthUserProfile = {
  id: string;
  batteryKwh: number;
  isBlocked: boolean;
};

export abstract class AuthRpcPort {
  abstract getProfile(userId: string): Promise<AuthUserProfile>;
}
