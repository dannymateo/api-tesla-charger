export abstract class BillingEventsPort {
  abstract publishInvoicesPaid(payload: unknown): Promise<void>;
  abstract publishUserDebtOverdue(payload: unknown): Promise<void>;
}
