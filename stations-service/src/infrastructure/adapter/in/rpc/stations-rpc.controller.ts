import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { StationsApplicationService } from '../../../../application/service/stations.application-service';

@Controller()
export class StationsRpcController {
  constructor(private readonly stationsApplicationService: StationsApplicationService) {}

  @MessagePattern('stations.create')
  create(
    @Payload()
    payload: {
      name: string;
      address: string;
      lat: number;
      lng: number;
      connectorsTotal: number;
      maxKwThreshold?: number;
      pricePerKwh: number;
    },
  ) {
    return this.stationsApplicationService.create(payload);
  }

  @MessagePattern('stations.update')
  update(
    @Payload()
    payload: {
      id: string;
      name?: string;
      address?: string;
      lat?: number;
      lng?: number;
      connectorsTotal?: number;
      maxKwThreshold?: number;
      pricePerKwh?: number;
    },
  ) {
    const { id, ...data } = payload;
    return this.stationsApplicationService.update(id, data);
  }

  @MessagePattern('stations.delete')
  delete(@Payload() payload: { id: string }) {
    return this.stationsApplicationService.delete(payload.id);
  }

  @MessagePattern('stations.toggle')
  toggle(@Payload() payload: { id: string; enabled: boolean }) {
    return this.stationsApplicationService.toggle(payload.id, payload.enabled);
  }

  @MessagePattern('stations.update_price')
  updatePrice(@Payload() payload: { id: string; pricePerKwh: number }) {
    return this.stationsApplicationService.updatePrice(payload.id, payload.pricePerKwh);
  }

  @MessagePattern('stations.get')
  get(@Payload() payload: { id: string }) {
    return this.stationsApplicationService.get(payload.id);
  }

  @MessagePattern('stations.list_public')
  listPublic() {
    return this.stationsApplicationService.listPublic();
  }

  @MessagePattern('stations.list_admin')
  listAdmin() {
    return this.stationsApplicationService.listAdmin();
  }

  @MessagePattern('stations.state.get')
  getState(@Payload() payload: { id: string }) {
    return this.stationsApplicationService.getState(payload.id);
  }

  @MessagePattern('stations.state.publish')
  publishState(@Payload() payload: { id: string }) {
    return this.stationsApplicationService.publishCurrentState(payload.id);
  }
}
