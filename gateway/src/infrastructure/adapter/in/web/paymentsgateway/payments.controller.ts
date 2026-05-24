import {
	Body,
	Controller,
	Headers,
	HttpException,
	HttpStatus,
	Post,
	UseGuards,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiResponse,
	ApiTags,
	ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AuthenticatedUser } from "../../../../../domain/model/authenticated-user";
import { BillingRpcClient } from "../../../../messaging/billing-rpc.client";
import { CurrentUser } from "../shared/decorators/current-user.decorator";
import { CreatePayPalPaymentDto } from "./payments.dto";
import { JwtAuthGuard } from "../shared/guards/jwt-auth.guard";

@ApiTags("Payments")
@Controller()
export class PaymentsController {
	constructor(private readonly billingRpcClient: BillingRpcClient) {}

	@Post("payments/paypal/create")
	@UseGuards(JwtAuthGuard)
	@ApiOperation({
		summary: "Iniciar pago PayPal de una o varias facturas",
		description: "Devuelve approvalUrl para redirigir al checkout de PayPal.",
	})
	@ApiBearerAuth("BearerAuth")
	@ApiBody({ type: CreatePayPalPaymentDto })
	@ApiResponse({ status: 201, description: "Orden PayPal creada." })
	@ApiUnauthorizedResponse({ description: "JWT invalido o expirado." })
	createPayPalCheckout(
		@CurrentUser() user: AuthenticatedUser,
		@Body() body: CreatePayPalPaymentDto,
	) {
		return this.billingRpcClient.createPayPalOrder({
			userId: user.sub,
			invoiceIds: body.invoiceIds,
		});
	}

	@Post("payments/paypal/webhook")
	@ApiOperation({
		summary: "Webhook PayPal (pass-through)",
		description: "Reenvia el evento a billing-service para capturar el pago.",
	})
	async paypalWebhook(
		@Headers() headers: Record<string, string | string[] | undefined>,
		@Body() payload: Record<string, unknown>,
	) {
		const baseUrl =
			process.env.BILLING_WEBHOOK_BASE_URL ?? "http://billing-service:3000";
		const targetUrl = `${baseUrl.replace(/\/$/, "")}/payments/paypal/webhook`;

		const forwardHeaders: Record<string, string> = {
			"Content-Type": "application/json",
		};
		for (const name of [
			"paypal-transmission-id",
			"paypal-transmission-time",
			"paypal-cert-url",
			"paypal-auth-algo",
			"paypal-transmission-sig",
		]) {
			const value = headers[name];
			if (typeof value === "string") {
				forwardHeaders[name] = value;
			} else if (Array.isArray(value) && value[0]) {
				forwardHeaders[name] = value[0];
			}
		}

		try {
			const response = await fetch(targetUrl, {
				method: "POST",
				headers: forwardHeaders,
				body: JSON.stringify(payload),
			});
			const text = await response.text();
			const body = text
				? (JSON.parse(text) as Record<string, unknown>)
				: { received: true };
			if (!response.ok) {
				throw new HttpException(body, response.status);
			}
			return body;
		} catch (error) {
			if (error instanceof HttpException) {
				throw error;
			}
			throw new HttpException(
				{
					error: `Could not forward webhook to billing-service: ${(error as Error).message}`,
				},
				HttpStatus.BAD_GATEWAY,
			);
		}
	}
}
