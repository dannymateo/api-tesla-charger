import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { rethrowRpcError } from './rpc-error.mapper';

@Injectable()
export class BillingRpcClient {
  constructor(@Inject('BILLING_RPC_CLIENT') private readonly client: ClientProxy) {}

  private async send<TResponse>(pattern: string, payload: unknown): Promise<TResponse> {
    try {
      return await firstValueFrom(this.client.send<TResponse, unknown>(pattern, payload).pipe(timeout(3000)));
    } catch (error) {
      rethrowRpcError(error, 'billing-service');
    }
  }

  listInvoices(payload: { userId: string; status?: string; month?: string }) {
    return this.send('billing.invoices.list', payload);
  }

  getInvoice(payload: { userId: string; invoiceId: string }) {
    return this.send('billing.invoices.get', payload);
  }

  revenueToday() {
    return this.send('billing.admin.revenue_today', {});
  }

  revenueTodayByStation(): Promise<{
    date: string;
    stations: Array<{ stationId: string; total: number; paidInvoicesCount: number }>;
  }> {
    return this.send('billing.admin.revenue_today_by_station', {});
  }

  createPayPalOrder(payload: { userId: string; invoiceIds: string[] }) {
    return this.send('billing.pay.create_order', payload);
  }
}
