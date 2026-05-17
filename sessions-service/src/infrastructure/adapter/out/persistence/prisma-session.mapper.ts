import { ChargingSession as PrismaChargingSession, Prisma } from '@prisma/client';
import { parseSessionStatus } from '../../../../domain/enum/session-status.enum';
import {
  ChargingSession,
  ChargingSessionCreate,
  ChargingSessionUpdate,
} from '../../../../domain/model/charging-session';

export function toDomainSession(record: PrismaChargingSession): ChargingSession {
  return ChargingSession.reconstitute({
    id: record.id,
    userId: record.userId,
    stationId: record.stationId,
    requestedKwh: Number(record.requestedKwh),
    deliveredKwh: Number(record.deliveredKwh),
    pricePerKwhSnapshot: Number(record.pricePerKwhSnapshot),
    status: parseSessionStatus(record.status),
    rejectionReason: record.rejectionReason,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    lastProgressAt: record.lastProgressAt,
  });
}

export function toPrismaCreateInput(data: ChargingSessionCreate): Prisma.ChargingSessionCreateInput {
  return {
    userId: data.userId,
    stationId: data.stationId,
    requestedKwh: new Prisma.Decimal(data.requestedKwh),
    deliveredKwh: new Prisma.Decimal(data.deliveredKwh),
    pricePerKwhSnapshot: new Prisma.Decimal(data.pricePerKwhSnapshot),
    status: data.status,
    rejectionReason: data.rejectionReason,
    startedAt: data.startedAt,
    endedAt: data.endedAt,
    lastProgressAt: data.lastProgressAt,
  };
}

export function toPrismaUpdateInput(data: ChargingSessionUpdate): Prisma.ChargingSessionUpdateInput {
  return {
    deliveredKwh: data.deliveredKwh !== undefined ? new Prisma.Decimal(data.deliveredKwh) : undefined,
    status: data.status,
    rejectionReason: data.rejectionReason,
    startedAt: data.startedAt,
    endedAt: data.endedAt,
    lastProgressAt: data.lastProgressAt,
  };
}
