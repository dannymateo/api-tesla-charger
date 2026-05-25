import { Injectable } from '@nestjs/common';
import { BillingRpcClient } from '../../infrastructure/messaging/billing-rpc.client';
import { SessionsRpcClient } from '../../infrastructure/messaging/sessions-rpc.client';
import { StationsRpcClient } from '../../infrastructure/messaging/stations-rpc.client';

type StationRecord = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  connectorsTotal: number;
  maxKwThreshold: number;
  pricePerKwh: number;
  enabled: boolean;
};

type StationStateRecord = {
  stationId: string;
  state: string;
  enabled: boolean;
  activeKw: number;
  busyConnectors: number;
  freeConnectors: number;
  connectorsTotal: number;
  maxKwThreshold: number;
  pricePerKwh: number;
};

type ActiveSessionRecord = {
  id: string;
  userId: string;
  stationId: string;
  requestedKwh: number;
  deliveredKwh: number;
  percentComplete: number;
  accumulatedCost: number;
  status: string;
};

@Injectable()
export class AdminMapService {
  constructor(
    private readonly stationsRpcClient: StationsRpcClient,
    private readonly sessionsRpcClient: SessionsRpcClient,
    private readonly billingRpcClient: BillingRpcClient,
  ) {}

  async getAdminMap() {
    const [stations, activeSessions, revenueByStation] = await Promise.all([
      this.stationsRpcClient.listAdmin() as Promise<StationRecord[]>,
      this.sessionsRpcClient.listActive() as Promise<ActiveSessionRecord[]>,
      this.billingRpcClient.revenueTodayByStation(),
    ]);

    const sessionsByStation = this.groupSessionsByStation(activeSessions);
    const revenueMap = new Map(revenueByStation.stations.map((row) => [row.stationId, row]));

    const states = await Promise.all(
      stations.map(
        (station) =>
          this.stationsRpcClient.getState({ id: station.id }) as Promise<StationStateRecord>,
      ),
    );
    const stateMap = new Map(states.map((state) => [state.stationId, state]));

    return {
      date: revenueByStation.date,
      stations: stations.map((station) => {
        const state = stateMap.get(station.id);
        const revenue = revenueMap.get(station.id);

        return {
          id: station.id,
          name: station.name,
          address: station.address,
          lat: Number(station.lat),
          lng: Number(station.lng),
          enabled: station.enabled,
          pricePerKwh: Number(station.pricePerKwh),
          connectorsTotal: station.connectorsTotal,
          maxKwThreshold: station.maxKwThreshold,
          state: state?.state ?? 'DISABLED',
          activeKw: state?.activeKw ?? 0,
          busyConnectors: state?.busyConnectors ?? 0,
          freeConnectors: state?.freeConnectors ?? 0,
          activeSessions: sessionsByStation.get(station.id) ?? [],
          revenueToday: {
            total: revenue?.total ?? 0,
            paidInvoicesCount: revenue?.paidInvoicesCount ?? 0,
          },
        };
      }),
    };
  }

  async enrichStationEventForAdmin(payload: { stationId?: string } & Record<string, unknown>) {
    const stationId = payload.stationId;
    if (!stationId) {
      return {
        ...payload,
        activeSessions: [],
        revenueToday: { total: 0, paidInvoicesCount: 0 },
      };
    }

    const [activeSessions, revenueByStation] = await Promise.all([
      this.sessionsRpcClient.listActive() as Promise<ActiveSessionRecord[]>,
      this.billingRpcClient.revenueTodayByStation(),
    ]);

    const revenue = revenueByStation.stations.find((row) => row.stationId === stationId);

    return {
      ...payload,
      activeSessions: activeSessions.filter((session) => session.stationId === stationId),
      revenueToday: {
        total: revenue?.total ?? 0,
        paidInvoicesCount: revenue?.paidInvoicesCount ?? 0,
      },
    };
  }

  private groupSessionsByStation(sessions: ActiveSessionRecord[]) {
    const map = new Map<string, ActiveSessionRecord[]>();
    for (const session of sessions) {
      const list = map.get(session.stationId) ?? [];
      list.push(session);
      map.set(session.stationId, list);
    }
    return map;
  }
}
