export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export function parseInvoiceStatus(value: string): InvoiceStatus {
  if (Object.values(InvoiceStatus).includes(value as InvoiceStatus)) {
    return value as InvoiceStatus;
  }
  throw new Error(`Invalid invoice status: ${value}`);
}

export function isPayableInvoiceStatus(status: InvoiceStatus): boolean {
  return status === InvoiceStatus.PENDING || status === InvoiceStatus.OVERDUE;
}
