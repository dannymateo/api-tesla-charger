import { SessionStatus } from '../enum/session-status.enum';
import { ChargingSession } from './charging-session';

export class SessionView {
  private constructor(
    readonly id: string,
    readonly userId: string,
    readonly stationId: string,
    readonly requestedKwh: number,
    readonly deliveredKwh: number,
    readonly pricePerKwh: number,
    readonly status: SessionStatus,
    readonly rejectionReason: string | null,
    readonly startedAt: string | null,
    readonly endedAt: string | null,
    readonly lastProgressAt: string | null,
    readonly accumulatedCost: number,
    readonly percentComplete: number,
  ) {}

  static fromSession(session: ChargingSession): SessionView {
    const pricePerKwh = session.pricePerKwhSnapshot;
    const deliveredKwh = session.deliveredKwh;
    const requestedKwh = session.requestedKwh;

    return new SessionView(
      session.id,
      session.userId,
      session.stationId,
      requestedKwh,
      deliveredKwh,
      pricePerKwh,
      session.status,
      session.rejectionReason,
      session.startedAt?.toISOString() ?? null,
      session.endedAt?.toISOString() ?? null,
      session.lastProgressAt?.toISOString() ?? null,
      deliveredKwh * pricePerKwh,
      SessionView.computePercentComplete(session.status, requestedKwh, deliveredKwh),
    );
  }

  private static computePercentComplete(
    status: SessionStatus,
    requestedKwh: number,
    deliveredKwh: number,
  ): number {
    if (status === SessionStatus.IN_PROGRESS && requestedKwh > 0) {
      return Math.min(Math.round((deliveredKwh / requestedKwh) * 100), 100);
    }
    if (status === SessionStatus.COMPLETED) {
      return 100;
    }
    return 0;
  }
}
