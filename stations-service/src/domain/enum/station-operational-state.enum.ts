export enum StationOperationalState {
  AVAILABLE = 'AVAILABLE',
  DISABLED = 'DISABLED',
  NO_CONNECTORS = 'NO_CONNECTORS',
  SATURATED = 'SATURATED',
}

export function computeStationOperationalState(input: {
  enabled: boolean;
  connectorsTotal: number;
  busyConnectors: number;
  activeKw: number;
  maxKwThreshold: number;
}): StationOperationalState {
  if (!input.enabled) {
    return StationOperationalState.DISABLED;
  }
  if (input.busyConnectors >= input.connectorsTotal) {
    return StationOperationalState.NO_CONNECTORS;
  }
  if (input.activeKw >= input.maxKwThreshold) {
    return StationOperationalState.SATURATED;
  }
  return StationOperationalState.AVAILABLE;
}
