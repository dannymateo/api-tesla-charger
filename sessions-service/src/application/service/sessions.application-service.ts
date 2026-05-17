import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { SessionStatus } from '../../domain/enum/session-status.enum';
import {
  ChargingSessionCreate,
  ChargingSessionUpdate,
} from '../../domain/model/charging-session';
import { SessionView } from '../../domain/model/session-view';
import { AuthRpcPort } from '../port/out/auth-rpc.port';
import { SessionEventsPort } from '../port/out/session-events.port';
import { SessionRepositoryPort } from '../port/out/session-repository.port';
import { StationCachePort } from '../port/out/station-cache.port';
import { StationsRpcPort } from '../port/out/stations-rpc.port';

type ActiveTimer = {
  stepTimer: NodeJS.Timeout;
};

@Injectable()
export class SessionsApplicationService implements OnModuleInit {
  private readonly logger = new Logger(SessionsApplicationService.name);
  private readonly timers = new Map<string, ActiveTimer>();
  private readonly chargeRateKwhPerSec = Number(process.env.CHARGE_RATE_KWH_PER_SEC ?? 5);

  constructor(
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly stationCache: StationCachePort,
    private readonly authRpc: AuthRpcPort,
    private readonly stationsRpc: StationsRpcPort,
    private readonly sessionEvents: SessionEventsPort,
  ) {}

  async onModuleInit() {
    await this.recoverInProgressSessions();
  }

  async startSession(input: { userId: string; stationId: string; requestedKwh: number }) {
    const requestedKwh = Number(input.requestedKwh);
    if (requestedKwh < 1) {
      throw new RpcException({
        statusCode: 400,
        code: 'INVALID_KWH',
        message: 'requestedKwh must be >= 1',
      });
    }

    const stationState = await this.stationsRpc.getStationState(input.stationId);

    if (!stationState.enabled || stationState.state === 'DISABLED') {
      return this.rejectSession(input, 'STATION_DISABLED', 'La estacion esta deshabilitada');
    }
    if (stationState.state === 'NO_CONNECTORS' || stationState.freeConnectors <= 0) {
      return this.rejectSession(input, 'NO_CONNECTORS', 'No hay conectores disponibles');
    }
    if (requestedKwh > stationState.maxKwThreshold) {
      return this.rejectSession(
        input,
        'EXCEEDS_STATION_THRESHOLD',
        'La carga solicitada supera el maximo permitido por sesion en esta estacion',
      );
    }
    if (stationState.activeKw + requestedKwh > stationState.maxKwThreshold) {
      return this.rejectSession(
        input,
        'NETWORK_SATURATED',
        'La red de la estacion esta saturada para la carga solicitada',
      );
    }

    const profile = await this.authRpc.getProfile(input.userId);

    if (requestedKwh > profile.batteryKwh) {
      return this.rejectSession(
        input,
        'EXCEEDS_BATTERY_CAPACITY',
        'La carga solicitada supera la capacidad de bateria de tu vehiculo',
      );
    }

    if (profile.isBlocked) {
      return this.rejectSession(
        input,
        'USER_BLOCKED_DEBT',
        'Tienes deudas vencidas de mas de 30 dias. Paga tus facturas para continuar',
      );
    }

    const activeSession = await this.sessionRepository.findInProgressByUser(input.userId);
    if (activeSession) {
      return this.rejectSession(
        input,
        'USER_ALREADY_CHARGING',
        'Ya tienes una sesion de carga en progreso',
        { activeSessionId: activeSession.id },
      );
    }

    const reserve = await this.stationCache.reserveCapacity(
      input.stationId,
      requestedKwh,
      stationState.connectorsTotal,
    );
    if (!reserve.ok) {
      return this.rejectSession(input, reserve.reason, 'No hay conectores disponibles');
    }

    await this.stationsRpc.publishStationState(input.stationId);

    const pricePerKwh = Number(stationState.pricePerKwh);
    const session = await this.sessionRepository.create(
      new ChargingSessionCreate({
        userId: input.userId,
        stationId: input.stationId,
        requestedKwh,
        deliveredKwh: 0,
        pricePerKwhSnapshot: pricePerKwh,
        status: SessionStatus.IN_PROGRESS,
        startedAt: new Date(),
        lastProgressAt: new Date(),
      }),
    );

    const estimatedDurationSec = requestedKwh / this.chargeRateKwhPerSec;
    this.startSimulation(session.id, requestedKwh, pricePerKwh, estimatedDurationSec);

    return {
      sessionId: session.id,
      status: session.status,
      stationId: session.stationId,
      requestedKwh,
      estimatedDurationSec,
      estimatedTotalCost: requestedKwh * pricePerKwh,
      percentComplete: 0,
      deliveredKwh: 0,
      accumulatedCost: 0,
    };
  }

  async stopSession(sessionId: string, userId: string) {
    const session = await this.getOwnedSession(sessionId, userId);
    if (!session.isInProgress()) {
      return SessionView.fromSession(session);
    }
    return this.closeSession(session.id, SessionStatus.STOPPED);
  }

  countActiveByStation(stationId: string) {
    return this.sessionRepository.countInProgressByStation(stationId);
  }

  async getSession(sessionId: string, userId?: string) {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (userId && !session.isOwnedBy(userId)) {
      throw new RpcException({ statusCode: 403, code: 'FORBIDDEN', message: 'Forbidden' });
    }
    return SessionView.fromSession(session);
  }

  listForUser(userId: string) {
    return this.sessionRepository
      .findByUser(userId)
      .then((rows) => rows.map((row) => SessionView.fromSession(row)));
  }

  listActive() {
    return this.sessionRepository
      .findActive()
      .then((rows) => rows.map((row) => SessionView.fromSession(row)));
  }

  private async rejectSession(
    input: { userId: string; stationId: string; requestedKwh: number },
    code: string,
    message: string,
    extra?: Record<string, unknown>,
  ) {
    const stationState = await this.stationsRpc.getStationState(input.stationId).catch(() => null);
    const pricePerKwh = stationState ? Number(stationState.pricePerKwh) : 0;

    const session = await this.sessionRepository.create(
      new ChargingSessionCreate({
        userId: input.userId,
        stationId: input.stationId,
        requestedKwh: input.requestedKwh,
        deliveredKwh: 0,
        pricePerKwhSnapshot: pricePerKwh,
        status: SessionStatus.REJECTED,
        rejectionReason: code,
      }),
    );

    throw new RpcException({
      statusCode: 409,
      code,
      message,
      sessionId: session.id,
      ...extra,
    });
  }

  private startSimulation(
    sessionId: string,
    requestedKwh: number,
    pricePerKwh: number,
    estimatedDurationSec: number,
  ) {
    const stepDurationMs = Math.max((estimatedDurationSec / 10) * 1000, 100);
    let step = 0;

    const runStep = async () => {
      step += 1;
      const percent = Math.min(step * 10, 100);
      const deliveredKwh = (requestedKwh * percent) / 100;
      const remainingKwh = Math.max(requestedKwh - deliveredKwh, 0);
      const remainingSec = remainingKwh / this.chargeRateKwhPerSec;
      const accumulatedCost = deliveredKwh * pricePerKwh;

      await this.sessionRepository.update(
        sessionId,
        new ChargingSessionUpdate({
          deliveredKwh,
          lastProgressAt: new Date(),
        }),
      );

      const session = await this.sessionRepository.findById(sessionId);
      if (!session || !session.isInProgress()) {
        this.clearTimer(sessionId);
        return;
      }

      await this.sessionEvents.publishSessionProgress({
        sessionId,
        stationId: session.stationId,
        userId: session.userId,
        percentComplete: percent,
        deliveredKwh,
        remainingSec,
        accumulatedCost,
        pricePerKwh,
      });

      if (percent >= 100) {
        this.clearTimer(sessionId);
        await this.closeSession(sessionId, SessionStatus.COMPLETED);
        return;
      }

      const timer = setTimeout(() => {
        void runStep();
      }, stepDurationMs);
      this.timers.set(sessionId, { stepTimer: timer });
    };

    void runStep();
  }

  private async closeSession(sessionId: string, status: SessionStatus.COMPLETED | SessionStatus.STOPPED) {
    this.clearTimer(sessionId);

    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (!session.isInProgress()) {
      return SessionView.fromSession(session);
    }

    await this.stationCache.releaseCapacity(session.stationId, session.requestedKwh);
    await this.stationsRpc.publishStationState(session.stationId);

    const deliveredKwh = session.deliveredKwh;
    const pricePerKwh = session.pricePerKwhSnapshot;
    const finalCost = deliveredKwh * pricePerKwh;

    const closed = await this.sessionRepository.update(
      sessionId,
      new ChargingSessionUpdate({
        status,
        endedAt: new Date(),
        lastProgressAt: new Date(),
      }),
    );

    await this.sessionEvents.publishSessionClosed({
      sessionId: closed.id,
      userId: closed.userId,
      stationId: closed.stationId,
      kwh: deliveredKwh,
      unitPrice: pricePerKwh,
      total: finalCost,
      status,
      closedAt: closed.endedAt?.toISOString(),
    });

    return SessionView.fromSession(closed);
  }

  private async recoverInProgressSessions() {
    let active = await this.sessionRepository.findInProgress();
    if (active.length === 0) {
      return;
    }

    await this.closeDuplicateInProgressSessions(active);

    active = await this.sessionRepository.findInProgress();
    if (active.length === 0) {
      return;
    }

    const loadByStation = new Map<string, { activeKw: number; busyConnectors: number }>();
    for (const session of active) {
      const current = loadByStation.get(session.stationId) ?? { activeKw: 0, busyConnectors: 0 };
      current.activeKw += session.requestedKwh;
      current.busyConnectors += 1;
      loadByStation.set(session.stationId, current);
    }
    for (const [stationId, load] of loadByStation.entries()) {
      await this.stationCache.setStationLoad(stationId, load.activeKw, load.busyConnectors);
    }

    this.logger.log(`Recovering ${active.length} in-progress sessions`);

    for (const session of active) {
      const requestedKwh = session.requestedKwh;
      const startedAt = session.startedAt?.getTime() ?? Date.now();
      const elapsedSec = (Date.now() - startedAt) / 1000;
      const expectedDurationSec = requestedKwh / this.chargeRateKwhPerSec;

      if (elapsedSec >= expectedDurationSec) {
        await this.sessionRepository.update(
          session.id,
          new ChargingSessionUpdate({ deliveredKwh: requestedKwh }),
        );
        await this.closeSession(session.id, SessionStatus.COMPLETED);
        continue;
      }

      const percent = Math.min((elapsedSec / expectedDurationSec) * 100, 99);
      const deliveredKwh = (requestedKwh * percent) / 100;
      await this.sessionRepository.update(
        session.id,
        new ChargingSessionUpdate({
          deliveredKwh,
          lastProgressAt: new Date(),
        }),
      );

      const remainingSec = expectedDurationSec - elapsedSec;
      this.startSimulation(session.id, requestedKwh, session.pricePerKwhSnapshot, remainingSec);
    }
  }

  private async closeDuplicateInProgressSessions(active: Awaited<ReturnType<SessionRepositoryPort['findInProgress']>>) {
    const byUser = new Map<string, typeof active>();
    for (const session of active) {
      const list = byUser.get(session.userId) ?? [];
      list.push(session);
      byUser.set(session.userId, list);
    }

    for (const [userId, sessions] of byUser.entries()) {
      if (sessions.length <= 1) {
        continue;
      }

      sessions.sort(
        (a, b) => (a.startedAt?.getTime() ?? 0) - (b.startedAt?.getTime() ?? 0),
      );
      const [, ...duplicates] = sessions;

      for (const duplicate of duplicates) {
        this.logger.warn(
          `Closing duplicate IN_PROGRESS session ${duplicate.id} for user ${userId}`,
        );
        this.clearTimer(duplicate.id);
        await this.stationCache.releaseCapacity(duplicate.stationId, duplicate.requestedKwh);
        await this.sessionRepository.update(
          duplicate.id,
          new ChargingSessionUpdate({
            status: SessionStatus.STOPPED,
            endedAt: new Date(),
          }),
        );
      }
    }
  }

  private clearTimer(sessionId: string) {
    const active = this.timers.get(sessionId);
    if (active) {
      clearTimeout(active.stepTimer);
      this.timers.delete(sessionId);
    }
  }

  private async getOwnedSession(sessionId: string, userId: string) {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (!session.isOwnedBy(userId)) {
      throw new RpcException({ statusCode: 403, code: 'FORBIDDEN', message: 'Forbidden' });
    }
    return session;
  }
}
