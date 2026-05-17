import { DomainValidationError } from '../error/domain-validation.error';
import { SessionStatus } from '../enum/session-status.enum';

export class ChargingSessionCreate {
  readonly userId: string;
  readonly stationId: string;
  readonly requestedKwh: number;
  readonly deliveredKwh: number;
  readonly pricePerKwhSnapshot: number;
  readonly status: SessionStatus;
  readonly rejectionReason?: string;
  readonly startedAt?: Date;
  readonly endedAt?: Date;
  readonly lastProgressAt?: Date;

  constructor(input: {
    userId: string;
    stationId: string;
    requestedKwh: number;
    deliveredKwh: number;
    pricePerKwhSnapshot: number;
    status: SessionStatus;
    rejectionReason?: string;
    startedAt?: Date;
    endedAt?: Date;
    lastProgressAt?: Date;
  }) {
    ChargingSessionCreate.validateUserId(input.userId);
    ChargingSessionCreate.validateStationId(input.stationId);
    ChargingSessionCreate.validateKwh(input.requestedKwh, 'requestedKwh');
    ChargingSessionCreate.validateKwh(input.deliveredKwh, 'deliveredKwh', true);
    ChargingSessionCreate.validatePrice(input.pricePerKwhSnapshot);

    this.userId = input.userId;
    this.stationId = input.stationId;
    this.requestedKwh = input.requestedKwh;
    this.deliveredKwh = input.deliveredKwh;
    this.pricePerKwhSnapshot = input.pricePerKwhSnapshot;
    this.status = input.status;
    this.rejectionReason = input.rejectionReason;
    this.startedAt = input.startedAt;
    this.endedAt = input.endedAt;
    this.lastProgressAt = input.lastProgressAt;
  }

  private static validateUserId(userId: string) {
    if (!userId?.trim()) {
      throw new DomainValidationError('User id is required');
    }
  }

  private static validateStationId(stationId: string) {
    if (!stationId?.trim()) {
      throw new DomainValidationError('Station id is required');
    }
  }

  private static validateKwh(value: number, field: string, allowZero = false) {
    const minimum = allowZero ? 0 : 1;
    if (value < minimum) {
      throw new DomainValidationError(`${field} must be >= ${minimum}`);
    }
  }

  private static validatePrice(price: number) {
    if (price < 0) {
      throw new DomainValidationError('Price per kWh must be >= 0');
    }
  }
}

export class ChargingSessionUpdate {
  readonly deliveredKwh?: number;
  readonly status?: SessionStatus;
  readonly rejectionReason?: string;
  readonly startedAt?: Date;
  readonly endedAt?: Date;
  readonly lastProgressAt?: Date;

  constructor(input: {
    deliveredKwh?: number;
    status?: SessionStatus;
    rejectionReason?: string;
    startedAt?: Date;
    endedAt?: Date;
    lastProgressAt?: Date;
  }) {
    if (input.deliveredKwh !== undefined && input.deliveredKwh < 0) {
      throw new DomainValidationError('deliveredKwh must be >= 0');
    }
    this.deliveredKwh = input.deliveredKwh;
    this.status = input.status;
    this.rejectionReason = input.rejectionReason;
    this.startedAt = input.startedAt;
    this.endedAt = input.endedAt;
    this.lastProgressAt = input.lastProgressAt;
  }
}

export class ChargingSession {
  private constructor(
    readonly id: string,
    readonly userId: string,
    readonly stationId: string,
    readonly requestedKwh: number,
    readonly deliveredKwh: number,
    readonly pricePerKwhSnapshot: number,
    readonly status: SessionStatus,
    readonly rejectionReason: string | null,
    readonly startedAt: Date | null,
    readonly endedAt: Date | null,
    readonly lastProgressAt: Date | null,
  ) {}

  static reconstitute(props: {
    id: string;
    userId: string;
    stationId: string;
    requestedKwh: number;
    deliveredKwh: number;
    pricePerKwhSnapshot: number;
    status: SessionStatus;
    rejectionReason: string | null;
    startedAt: Date | null;
    endedAt: Date | null;
    lastProgressAt: Date | null;
  }): ChargingSession {
    return new ChargingSession(
      props.id,
      props.userId,
      props.stationId,
      props.requestedKwh,
      props.deliveredKwh,
      props.pricePerKwhSnapshot,
      props.status,
      props.rejectionReason,
      props.startedAt,
      props.endedAt,
      props.lastProgressAt,
    );
  }

  isOwnedBy(userId: string): boolean {
    return this.userId === userId;
  }

  isInProgress(): boolean {
    return this.status === SessionStatus.IN_PROGRESS;
  }
}
