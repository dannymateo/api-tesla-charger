import { StationOperationalState } from '../enum/station-operational-state.enum';
import { Station } from './station';

export class StationStateView {
  private constructor(
    readonly stationId: string,
    readonly state: StationOperationalState,
    readonly enabled: boolean,
    readonly activeKw: number,
    readonly busyConnectors: number,
    readonly freeConnectors: number,
    readonly connectorsTotal: number,
    readonly maxKwThreshold: number,
    readonly pricePerKwh: number,
  ) {}

  static fromStationAndLoad(
    station: Station,
    load: { activeKw: number; busyConnectors: number },
    state: StationOperationalState,
  ): StationStateView {
    return new StationStateView(
      station.id,
      state,
      station.enabled,
      load.activeKw,
      load.busyConnectors,
      Math.max(station.connectorsTotal - load.busyConnectors, 0),
      station.connectorsTotal,
      station.maxKwThreshold,
      station.pricePerKwh,
    );
  }

  toJSON() {
    return {
      stationId: this.stationId,
      state: this.state,
      enabled: this.enabled,
      activeKw: this.activeKw,
      busyConnectors: this.busyConnectors,
      freeConnectors: this.freeConnectors,
      connectorsTotal: this.connectorsTotal,
      maxKwThreshold: this.maxKwThreshold,
      pricePerKwh: this.pricePerKwh,
    };
  }
}
