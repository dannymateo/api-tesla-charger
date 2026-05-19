import { DomainValidationError } from '../error/domain-validation.error';
import { InvoiceStatus } from '../enum/invoice-status.enum';

export class Invoice {
  private constructor(
    readonly id: string,
    readonly userId: string,
    readonly sessionId: string,
    readonly kwh: number,
    readonly unitPrice: number,
    readonly total: number,
    readonly status: InvoiceStatus,
    readonly issuedAt: Date,
    readonly paidAt: Date | null,
  ) {}

  static createNew(input: {
    userId: string;
    sessionId: string;
    stationId: string;
    kwh: number;
    unitPrice: number;
    total: number;
  }) {
    Invoice.validateUserId(input.userId);
    Invoice.validateSessionId(input.sessionId);
    Invoice.validateStationId(input.stationId);
    Invoice.validateKwh(input.kwh);
    Invoice.validatePrice(input.unitPrice);
    Invoice.validateTotal(input.total);

    return {
      userId: input.userId,
      sessionId: input.sessionId,
      stationId: input.stationId,
      kwh: input.kwh,
      unitPrice: input.unitPrice,
      total: input.total,
      status: InvoiceStatus.PENDING,
    };
  }

  static reconstitute(props: {
    id: string;
    userId: string;
    sessionId: string;
    kwh: number;
    unitPrice: number;
    total: number;
    status: InvoiceStatus;
    issuedAt: Date;
    paidAt: Date | null;
  }): Invoice {
    return new Invoice(
      props.id,
      props.userId,
      props.sessionId,
      props.kwh,
      props.unitPrice,
      props.total,
      props.status,
      props.issuedAt,
      props.paidAt,
    );
  }

  isPayable(): boolean {
    return this.status === InvoiceStatus.PENDING || this.status === InvoiceStatus.OVERDUE;
  }

  private static validateUserId(userId: string) {
    if (!userId?.trim()) {
      throw new DomainValidationError('User id is required');
    }
  }

  private static validateSessionId(sessionId: string) {
    if (!sessionId?.trim()) {
      throw new DomainValidationError('Session id is required');
    }
  }

  private static validateStationId(stationId: string) {
    if (!stationId?.trim()) {
      throw new DomainValidationError('Station id is required');
    }
  }

  private static validateKwh(kwh: number) {
    if (kwh < 0) {
      throw new DomainValidationError('kWh must be >= 0');
    }
  }

  private static validatePrice(unitPrice: number) {
    if (unitPrice < 0) {
      throw new DomainValidationError('Unit price must be >= 0');
    }
  }

  private static validateTotal(total: number) {
    if (total < 0) {
      throw new DomainValidationError('Total must be >= 0');
    }
  }
}
