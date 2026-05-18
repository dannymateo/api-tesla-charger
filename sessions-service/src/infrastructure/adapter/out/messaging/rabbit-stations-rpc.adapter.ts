import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  StationStateResponse,
  StationsRpcPort,
} from '../../../../application/port/out/stations-rpc.port';
import { rethrowRpcError } from '../../../messaging/rpc-error.mapper';

@Injectable()
export class RabbitStationsRpcAdapter extends StationsRpcPort {
  constructor(@Inject('STATIONS_RPC_CLIENT') private readonly client: ClientProxy) {
    super();
  }

  async getStationState(stationId: string) {
    try {
      return await firstValueFrom(
        this.client
          .send<StationStateResponse, { id: string }>('stations.state.get', { id: stationId })
          .pipe(timeout(3000)),
      );
    } catch (error) {
      rethrowRpcError(error, 'stations-service');
    }
  }

  async publishStationState(stationId: string) {
    try {
      return await firstValueFrom(
        this.client
          .send<StationStateResponse, { id: string }>('stations.state.publish', { id: stationId })
          .pipe(timeout(3000)),
      );
    } catch (error) {
      rethrowRpcError(error, 'stations-service');
    }
  }
}
