import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BillingApplicationService } from '../../../../application/service/billing.application-service';
import { PaymentApplicationService } from '../../../../application/service/payment.application-service';
import { RpcHttpExceptionFilter } from '../../../filters/rpc-http-exception.filter';

@Controller()
@UseFilters(RpcHttpExceptionFilter)
export class BillingRpcController {
  constructor(
    private readonly billingApplicationService: BillingApplicationService,
    private readonly paymentApplicationService: PaymentApplicationService,
  ) {}

  @MessagePattern('billing.invoices.list')
  listInvoices(
    @Payload() payload: { userId: string; status?: string; month?: string },
  ) {
    return this.billingApplicationService.listInvoices(payload);
  }

  @MessagePattern('billing.invoices.get')
  getInvoice(@Payload() payload: { userId: string; invoiceId: string }) {
    return this.billingApplicationService.getInvoice(payload);
  }

  @MessagePattern('billing.admin.revenue_today')
  revenueToday() {
    return this.billingApplicationService.revenueToday();
  }

  @MessagePattern('billing.admin.revenue_today_by_station')
  revenueTodayByStation() {
    return this.billingApplicationService.revenueTodayByStation();
  }

  @MessagePattern('billing.user.has_overdue')
  userHasOverdue(@Payload() payload: { userId: string }) {
    return this.billingApplicationService.userHasOverdueInvoices(payload.userId);
  }

  @MessagePattern('billing.pay.create_order')
  createPayPalOrder(@Payload() payload: { userId: string; invoiceIds: string[] }) {
    return this.paymentApplicationService.createPayPalCheckout(payload.userId, payload.invoiceIds);
  }
}
