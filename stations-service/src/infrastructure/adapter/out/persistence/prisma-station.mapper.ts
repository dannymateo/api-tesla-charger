import { Station as PrismaStation } from '@prisma/client';
import { Station } from '../../../../domain/model/station';

export function toDomainStation(record: PrismaStation): Station {
  return Station.reconstitute({
    id: record.id,
    name: record.name,
    address: record.address,
    lat: Number(record.lat),
    lng: Number(record.lng),
    connectorsTotal: record.connectorsTotal,
    maxKwThreshold: record.maxKwThreshold,
    pricePerKwh: Number(record.pricePerKwh),
    enabled: record.enabled,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}
