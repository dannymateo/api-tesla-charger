import {
  ChargingSession,
  ChargingSessionCreate,
  ChargingSessionUpdate,
} from '../../../domain/model/charging-session';

export abstract class SessionRepositoryPort {
  abstract create(data: ChargingSessionCreate): Promise<ChargingSession>;
  abstract update(id: string, data: ChargingSessionUpdate): Promise<ChargingSession>;
  abstract findById(id: string): Promise<ChargingSession | null>;
  abstract findByUser(userId: string): Promise<ChargingSession[]>;
  abstract findActive(): Promise<ChargingSession[]>;
  abstract findInProgress(): Promise<ChargingSession[]>;
  abstract findInProgressByUser(userId: string): Promise<ChargingSession | null>;
  abstract countInProgressByStation(stationId: string): Promise<number>;
}
