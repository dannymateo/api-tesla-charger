import { CreateStationData, Station, UpdateStationData } from '../../../domain/model/station';

export abstract class StationRepositoryPort {
  abstract create(data: CreateStationData): Promise<Station>;
  abstract update(id: string, data: UpdateStationData): Promise<Station>;
  abstract delete(id: string): Promise<void>;
  abstract findById(id: string): Promise<Station | null>;
  abstract listPublic(): Promise<Station[]>;
  abstract listAdmin(): Promise<Station[]>;
}
