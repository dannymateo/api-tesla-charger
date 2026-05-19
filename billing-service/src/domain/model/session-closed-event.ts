import { DomainValidationError } from '../error/domain-validation.error';

export class SessionClosedEvent {
  private constructor(
    readonly sessionId: string,
    readonly userId: string,
    readonly stationId: string,
    readonly kwh: number,
    readonly unitPrice: number,
    readonly total: number,
    readonly status: string,
    readonly closedAt?: string,
  ) {}

  static create(payload: {
    sessionId: string;
    userId: string;
    stationId: string;
    kwh: number;
    unitPrice: number;
    total: number;
    status: string;
    closedAt?: string;
  }): SessionClosedEvent {
    if (!payload.sessionId?.trim()) {
      throw new DomainValidationError('Session id is required');
    }
    if (!payload.userId?.trim()) {
      throw new DomainValidationError('User id is required');
    }
    return new SessionClosedEvent(
      payload.sessionId,
      payload.userId,
      payload.stationId,
      payload.kwh,
      payload.unitPrice,
      payload.total,
      payload.status,
      payload.closedAt,
    );
  }

  isBillable(): boolean {
    return this.status === 'COMPLETED' || this.status === 'STOPPED';
  }
}
