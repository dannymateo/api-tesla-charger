import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { SessionsRpcPort } from '../../../../application/port/out/sessions-rpc.port';
import { rethrowRpcError } from '../../../messaging/rpc-error.mapper';

@Injectable()
export class RabbitSessionsRpcAdapter extends SessionsRpcPort {
  constructor(@Inject('SESSIONS_RPC_CLIENT') private readonly client: ClientProxy) {
    super();
  }

  async countActiveByStation(stationId: string) {
    try {
      return await firstValueFrom(
        this.client
          .send<number, { stationId: string }>('sessions.count_active_by_station', { stationId })
          .pipe(timeout(3000)),
      );
    } catch (error) {
      rethrowRpcError(error, 'sessions-service');
    }
  }
}
