import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { computeStationOperationalState } from '../../domain/enum/station-operational-state.enum';
import { Station } from '../../domain/model/station';
import { StationStateView } from '../../domain/model/station-state-view';
import { StationEventsPort } from '../port/out/station-events.port';
import { StationRepositoryPort } from '../port/out/station-repository.port';
import { StationStateCachePort } from '../port/out/station-state-cache.port';
import { SessionsRpcPort } from '../port/out/sessions-rpc.port';

@Injectable()
export class StationsApplicationService {
  constructor(
    private readonly stationRepository: StationRepositoryPort,
    private readonly stationStateCache: StationStateCachePort,
    private readonly stationEvents: StationEventsPort,
    private readonly sessionsRpc: SessionsRpcPort,
  ) {}

  async create(input: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    connectorsTotal: number;
    maxKwThreshold?: number;
    pricePerKwh: number;
  }) {
    const station = await this.stationRepository.create(
      Station.createNew({
        name: input.name,
        address: input.address,
        lat: input.lat,
        lng: input.lng,
        connectorsTotal: input.connectorsTotal,
        maxKwThreshold: input.maxKwThreshold ?? 100,
        pricePerKwh: input.pricePerKwh,
        enabled: true,
      }),
    );
    await this.publishStationState(station.id);
    return station;
  }

  async update(
    id: string,
    input: {
      name?: string;
      address?: string;
      lat?: number;
      lng?: number;
      connectorsTotal?: number;
      maxKwThreshold?: number;
      pricePerKwh?: number;
    },
  ) {
    await this.ensureExists(id);
    const station = await this.stationRepository.update(id, Station.validateUpdate(input));
    await this.publishStationState(station.id);
    return station;
  }

  async delete(id: string) {
    await this.ensureExists(id);
    await this.ensureNoActiveSessions(id);
    await this.stationRepository.delete(id);
    await this.stationEvents.publishStationStateChanged({
      stationId: id,
      state: 'DISABLED',
      enabled: false,
      deleted: true,
    });
    return { ok: true };
  }

  async toggle(id: string, enabled: boolean) {
    await this.ensureExists(id);
    if (!enabled) {
      await this.ensureNoActiveSessions(id);
    }
    const station = await this.stationRepository.update(id, { enabled });
    await this.publishStationState(station.id);
    return station;
  }

  async updatePrice(id: string, pricePerKwh: number) {
    await this.ensureExists(id);
    const station = await this.stationRepository.update(
      id,
      Station.validateUpdate({ pricePerKwh }),
    );
    await this.publishStationState(station.id);
    return station;
  }

  async get(id: string) {
    const station = await this.stationRepository.findById(id);
    if (!station) {
      throw new NotFoundException('Station not found');
    }
    return station;
  }

  async getState(id: string): Promise<StationStateView> {
    const station = await this.get(id);
    const realtime = await this.stationStateCache.getStationState(station.id);
    const state = computeStationOperationalState({
      enabled: station.enabled,
      connectorsTotal: station.connectorsTotal,
      busyConnectors: realtime.busyConnectors,
      activeKw: realtime.activeKw,
      maxKwThreshold: station.maxKwThreshold,
    });

    return StationStateView.fromStationAndLoad(station, realtime, state);
  }

  async publishCurrentState(id: string) {
    await this.publishStationState(id);
    return this.getState(id);
  }

  listPublic() {
    return this.stationRepository.listPublic();
  }

  listAdmin() {
    return this.stationRepository.listAdmin();
  }

  private async ensureExists(id: string) {
    const station = await this.stationRepository.findById(id);
    if (!station) {
      throw new NotFoundException('Station not found');
    }
  }

  private async ensureNoActiveSessions(stationId: string) {
    const activeCount = await this.sessionsRpc.countActiveByStation(stationId);
    if (activeCount > 0) {
      throw new ConflictException({
        code: 'STATION_HAS_ACTIVE_SESSIONS',
        message: 'Cannot disable or delete a station with active charging sessions',
        activeSessions: activeCount,
      });
    }
  }

  private async publishStationState(stationId: string) {
    const station = await this.get(stationId);
    const statePayload = await this.getState(stationId);
    await this.stationEvents.publishStationStateChanged({
      ...statePayload.toJSON(),
      name: station.name,
      address: station.address,
      lat: Number(station.lat),
      lng: Number(station.lng),
    });
  }
}
