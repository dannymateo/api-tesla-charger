export type StationStateResponse = {
  stationId: string;
  state: string;
  enabled: boolean;
  activeKw: number;
  busyConnectors: number;
  freeConnectors: number;
  connectorsTotal: number;
  maxKwThreshold: number;
  pricePerKwh: string | number;
};

export abstract class StationsRpcPort {
  abstract getStationState(stationId: string): Promise<StationStateResponse>;
  abstract publishStationState(stationId: string): Promise<StationStateResponse>;
}
