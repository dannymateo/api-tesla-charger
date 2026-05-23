import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { rethrowRpcError } from './rpc-error.mapper';

@Injectable()
export class AuthRpcClient {
  constructor(@Inject('AUTH_RPC_CLIENT') private readonly client: ClientProxy) {}

  private async send<TResponse>(pattern: string, payload: unknown): Promise<TResponse> {
    try {
      return await firstValueFrom(this.client.send<TResponse, unknown>(pattern, payload).pipe(timeout(3000)));
    } catch (error) {
      rethrowRpcError(error, 'auth-service');
    }
  }

  register(payload: { email: string; password: string; vehicleModel: string; batteryKwh: number }) {
    return this.send('auth.register', payload);
  }

  login(payload: { email: string; password: string }) {
    return this.send('auth.login', payload);
  }

  getProfile(payload: { userId: string }) {
    return this.send('auth.profile.get', payload);
  }

  updateProfile(payload: { userId: string; vehicleModel?: string; batteryKwh?: number }) {
    return this.send('auth.profile.update', payload);
  }

  listUsersOverdue() {
    return this.send('auth.admin.users_overdue', {});
  }
}
