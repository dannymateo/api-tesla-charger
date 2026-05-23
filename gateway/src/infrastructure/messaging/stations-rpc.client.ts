import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { rethrowRpcError } from './rpc-error.mapper';

@Injectable()
export class StationsRpcClient {
  constructor(@Inject('STATIONS_RPC_CLIENT') private readonly client: ClientProxy) {}

  private async send<TResponse>(pattern: string, payload: unknown): Promise<TResponse> {
    try {
      return await firstValueFrom(this.client.send<TResponse, unknown>(pattern, payload).pipe(timeout(3000)));
    } catch (error) {
      rethrowRpcError(error, 'stations-service');
    }
  }

  create(payload: unknown) {
    return this.send('stations.create', payload);
  }

  update(payload: unknown) {
    return this.send('stations.update', payload);
  }

  delete(payload: { id: string }) {
    return this.send('stations.delete', payload);
  }

  toggle(payload: { id: string; enabled: boolean }) {
    return this.send('stations.toggle', payload);
  }

  updatePrice(payload: { id: string; pricePerKwh: number }) {
    return this.send('stations.update_price', payload);
  }

  get(payload: { id: string }) {
    return this.send('stations.get', payload);
  }

  listPublic() {
    return this.send('stations.list_public', {});
  }

  listAdmin() {
    return this.send('stations.list_admin', {});
  }

  getState(payload: { id: string }) {
    return this.send('stations.state.get', payload);
  }
}
