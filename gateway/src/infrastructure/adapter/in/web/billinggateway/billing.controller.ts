import { Controller, ForbiddenException, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../../../domain/model/authenticated-user';
import { BillingRpcClient } from '../../../../messaging/billing-rpc.client';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { InvoiceIdParamDto, ListInvoicesQueryDto } from './billing.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';

@ApiTags('Billing')
@Controller()
export class BillingController {
  constructor(private readonly billingRpcClient: BillingRpcClient) {}

  @Get('me/invoices')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar facturas del usuario autenticado' })
  @ApiBearerAuth('BearerAuth')
  @ApiResponse({ status: 200, description: 'Listado de facturas.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  listMyInvoices(@CurrentUser() user: AuthenticatedUser, @Query() query: ListInvoicesQueryDto) {
    return this.billingRpcClient.listInvoices({
      userId: user.sub,
      status: query.status,
      month: query.month,
    });
  }

  @Get('me/invoices/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Consultar detalle de una factura' })
  @ApiBearerAuth('BearerAuth')
  @ApiResponse({ status: 200, description: 'Factura encontrada.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  getMyInvoice(@CurrentUser() user: AuthenticatedUser, @Param() params: InvoiceIdParamDto) {
    return this.billingRpcClient.getInvoice({ userId: user.sub, invoiceId: params.id });
  }

  @Get('admin/revenue/today')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Ingresos del dia por facturas pagadas (admin)' })
  @ApiBearerAuth('BearerAuth')
  @ApiResponse({ status: 200, description: 'Resumen de ingresos del dia.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  revenueToday(@CurrentUser() user: AuthenticatedUser) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin role required');
    }
    return this.billingRpcClient.revenueToday();
  }
}
