export abstract class StationEventsPort {
  abstract publishStationStateChanged(payload: unknown): Promise<void>;
}
