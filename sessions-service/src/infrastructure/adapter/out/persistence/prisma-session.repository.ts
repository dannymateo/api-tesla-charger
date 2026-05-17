import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SessionRepositoryPort } from '../../../../application/port/out/session-repository.port';
import { toDomainSession, toPrismaCreateInput, toPrismaUpdateInput } from './prisma-session.mapper';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

@Injectable()
export class PrismaSessionRepository extends PrismaService implements SessionRepositoryPort {
  async create(data: Parameters<SessionRepositoryPort['create']>[0]) {
    const session = await this.chargingSession.create({ data: toPrismaCreateInput(data) });
    return toDomainSession(session);
  }

  async update(id: string, data: Parameters<SessionRepositoryPort['update']>[1]) {
    const session = await this.chargingSession.update({
      where: { id },
      data: toPrismaUpdateInput(data),
    });
    return toDomainSession(session);
  }

  async findById(id: string) {
    const session = await this.chargingSession.findUnique({ where: { id } });
    return session ? toDomainSession(session) : null;
  }

  async findByUser(userId: string) {
    const sessions = await this.chargingSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });
    return sessions.map(toDomainSession);
  }

  async findActive() {
    const sessions = await this.chargingSession.findMany({
      where: { status: 'IN_PROGRESS' },
      orderBy: { startedAt: 'asc' },
    });
    return sessions.map(toDomainSession);
  }

  async findInProgress() {
    const sessions = await this.chargingSession.findMany({
      where: { status: 'IN_PROGRESS' },
    });
    return sessions.map(toDomainSession);
  }

  async findInProgressByUser(userId: string) {
    const session = await this.chargingSession.findFirst({
      where: { userId, status: 'IN_PROGRESS' },
      orderBy: { startedAt: 'desc' },
    });
    return session ? toDomainSession(session) : null;
  }

  countInProgressByStation(stationId: string) {
    return this.chargingSession.count({
      where: { stationId, status: 'IN_PROGRESS' },
    });
  }
}
