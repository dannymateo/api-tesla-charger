export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

export function parsePaymentStatus(value: string): PaymentStatus {
  if (Object.values(PaymentStatus).includes(value as PaymentStatus)) {
    return value as PaymentStatus;
  }
  throw new Error(`Invalid payment status: ${value}`);
}
