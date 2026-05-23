import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { rethrowRpcError } from './rpc-error.mapper';

@Injectable()
export class SessionsRpcClient {
  constructor(@Inject('SESSIONS_RPC_CLIENT') private readonly client: ClientProxy) {}

  private async send<TResponse>(pattern: string, payload: unknown): Promise<TResponse> {
    try {
      return await firstValueFrom(
        this.client.send<TResponse, unknown>(pattern, payload).pipe(timeout(5000)),
      );
    } catch (error) {
      rethrowRpcError(error, 'sessions-service');
    }
  }

  start(payload: { userId: string; stationId: string; requestedKwh: number }) {
    return this.send('sessions.start', payload);
  }

  stop(payload: { sessionId: string; userId: string }) {
    return this.send('sessions.stop', payload);
  }

  get(payload: { sessionId: string; userId?: string }) {
    return this.send('sessions.get', payload);
  }

  listForUser(payload: { userId: string }) {
    return this.send('sessions.list_for_user', payload);
  }

  listActive() {
    return this.send('sessions.list_active', {});
  }
}
