export abstract class StationStateCachePort {
  abstract getStationState(stationId: string): Promise<{
    activeKw: number;
    busyConnectors: number;
  }>;
}
