import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { AuthRpcPort, AuthUserProfile } from '../../../../application/port/out/auth-rpc.port';
import { rethrowRpcError } from '../../../messaging/rpc-error.mapper';

@Injectable()
export class RabbitAuthRpcAdapter extends AuthRpcPort {
  constructor(@Inject('AUTH_RPC_CLIENT') private readonly client: ClientProxy) {
    super();
  }

  async getProfile(userId: string) {
    try {
      return await firstValueFrom(
        this.client
          .send<AuthUserProfile, { userId: string }>('auth.profile.get', { userId })
          .pipe(timeout(3000)),
      );
    } catch (error) {
      rethrowRpcError(error, 'auth-service');
    }
  }
}
