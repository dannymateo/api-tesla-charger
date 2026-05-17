export abstract class StationCachePort {
  abstract reserveCapacity(
    stationId: string,
    requestedKwh: number,
    connectorsTotal: number,
  ): Promise<{ ok: true } | { ok: false; reason: string }>;
  abstract setStationLoad(stationId: string, activeKw: number, busyConnectors: number): Promise<void>;
  abstract releaseCapacity(stationId: string, reservedKwh: number): Promise<void>;
}
