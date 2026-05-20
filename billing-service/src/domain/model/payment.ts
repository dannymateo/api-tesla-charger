import { DomainValidationError } from '../error/domain-validation.error';
import { PaymentStatus } from '../enum/payment-status.enum';
import { Invoice } from './invoice';

export class Payment {
  protected constructor(
    readonly id: string,
    readonly paypalOrderId: string | null,
    readonly paypalCaptureId: string | null,
    readonly amount: number,
    readonly status: PaymentStatus,
    readonly createdAt: Date,
  ) {}

  static validatePendingAmount(amount: number): number {
    if (amount <= 0) {
      throw new DomainValidationError('Payment amount must be greater than zero');
    }
    return amount;
  }

  static reconstitute(props: {
    id: string;
    paypalOrderId: string | null;
    paypalCaptureId: string | null;
    amount: number;
    status: PaymentStatus;
    createdAt: Date;
  }): Payment {
    return new Payment(
      props.id,
      props.paypalOrderId,
      props.paypalCaptureId,
      props.amount,
      props.status,
      props.createdAt,
    );
  }

  isCompleted(): boolean {
    return this.status === PaymentStatus.COMPLETED;
  }
}

export class PaymentWithInvoices {
  private constructor(
    readonly payment: Payment,
    readonly invoiceLinks: Array<{ invoiceId: string; invoice: Invoice }>,
  ) {}

  get id() {
    return this.payment.id;
  }

  get paypalOrderId() {
    return this.payment.paypalOrderId;
  }

  get paypalCaptureId() {
    return this.payment.paypalCaptureId;
  }

  get amount() {
    return this.payment.amount;
  }

  get status() {
    return this.payment.status;
  }

  get createdAt() {
    return this.payment.createdAt;
  }

  static reconstitute(
    payment: Payment,
    invoiceLinks: Array<{ invoiceId: string; invoice: Invoice }>,
  ): PaymentWithInvoices {
    return new PaymentWithInvoices(payment, invoiceLinks);
  }

  isCompleted(): boolean {
    return this.payment.isCompleted();
  }
}
