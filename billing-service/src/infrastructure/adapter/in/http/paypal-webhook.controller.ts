import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentApplicationService } from '../../../../application/service/payment.application-service';

@Controller('payments/paypal')
export class PaypalWebhookController {
  private readonly logger = new Logger(PaypalWebhookController.name);

  constructor(private readonly paymentApplicationService: PaymentApplicationService) {}

  @Post('webhook')
  async webhook(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() payload: Record<string, unknown>,
  ) {
    const verified = await this.paymentApplicationService.verifyPayPalWebhook(headers, payload);
    if (!verified) {
      throw new UnauthorizedException('Invalid PayPal webhook signature');
    }

    const eventType = String(payload.event_type ?? '');
    const orderReference = this.extractOrderReference(payload);

    if (!orderReference) {
      return { received: true, ignored: true, reason: 'orderReference not found' };
    }

    if (eventType.toUpperCase() !== 'CHECKOUT.ORDER.APPROVED') {
      return { received: true, ignored: true, eventType };
    }

    try {
      const result = await this.paymentApplicationService.confirmPayPalOrder(
        orderReference,
        payload,
      );
      return {
        received: true,
        orderReference,
        ...result,
      };
    } catch (error) {
      this.logger.error(`PayPal webhook failed: ${(error as Error).message}`);
      throw new HttpException(
        {
          received: true,
          processed: false,
          error: (error as Error).message,
        },
        this.mapErrorStatus(error),
      );
    }
  }

  private extractOrderReference(payload: Record<string, unknown>): string | null {
    const resource = payload.resource as Record<string, unknown> | undefined;
    if (!resource) {
      return null;
    }

    const directId = resource.id;
    if (typeof directId === 'string' && directId.length > 0) {
      return directId;
    }

    const supplementary = resource.supplementary_data as Record<string, unknown> | undefined;
    const relatedIds = supplementary?.related_ids as Record<string, unknown> | undefined;
    const relatedOrderId = relatedIds?.order_id;
    if (typeof relatedOrderId === 'string' && relatedOrderId.length > 0) {
      return relatedOrderId;
    }

    return null;
  }

  private mapErrorStatus(error: unknown): HttpStatus {
    const message = (error as Error).message?.toLowerCase() ?? '';
    if (message.includes('not found')) {
      return HttpStatus.NOT_FOUND;
    }
    if (message.includes('not payable') || message.includes('obligator')) {
      return HttpStatus.BAD_REQUEST;
    }
    if (message.includes('not completed') || message.includes('not approved')) {
      return HttpStatus.CONFLICT;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
