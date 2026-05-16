export abstract class SessionsRpcPort {
  abstract countActiveByStation(stationId: string): Promise<number>;
}
