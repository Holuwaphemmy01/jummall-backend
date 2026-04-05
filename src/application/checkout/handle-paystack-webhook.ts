import type { CheckoutSessionRepository } from "../../ports/checkout-session-repository";
import type { PaymentProvider } from "../../ports/payment/payment-provider";
import {
  CompleteCheckoutAfterPayment,
  CompleteCheckoutAfterPaymentError
} from "./complete-checkout-after-payment";

interface PaystackWebhookPayload {
  event?: string;
  data?: {
    reference?: string;
  };
}

export interface HandlePaystackWebhookInput {
  rawBody: string;
  signature: string | null;
}

export interface HandlePaystackWebhookResult {
  processed: boolean;
  ignored: boolean;
  checkoutReference: string | null;
  orderId: string | null;
}

export interface HandlePaystackWebhookUseCase {
  execute(
    input: HandlePaystackWebhookInput
  ): Promise<HandlePaystackWebhookResult>;
}

export class HandlePaystackWebhookError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "HandlePaystackWebhookError";
  }
}

export class HandlePaystackWebhook implements HandlePaystackWebhookUseCase {
  constructor(
    private readonly paymentProvider: PaymentProvider,
    private readonly checkoutSessionRepository: CheckoutSessionRepository,
    private readonly completeCheckoutAfterPayment: CompleteCheckoutAfterPayment
  ) {}

  async execute(
    input: HandlePaystackWebhookInput
  ): Promise<HandlePaystackWebhookResult> {
    if (
      !this.paymentProvider.validateWebhookSignature({
        rawBody: input.rawBody,
        signature: input.signature
      })
    ) {
      throw new HandlePaystackWebhookError("Invalid webhook signature.", 401);
    }

    let payload: PaystackWebhookPayload;

    try {
      payload = JSON.parse(input.rawBody) as PaystackWebhookPayload;
    } catch {
      throw new HandlePaystackWebhookError("Invalid webhook payload.", 400);
    }

    if (payload.event !== "charge.success" || !payload.data?.reference) {
      return {
        processed: false,
        ignored: true,
        checkoutReference: payload.data?.reference ?? null,
        orderId: null
      };
    }

    const session = await this.checkoutSessionRepository.findByReference(
      payload.data.reference
    );

    if (!session) {
      return {
        processed: false,
        ignored: true,
        checkoutReference: payload.data.reference,
        orderId: null
      };
    }

    if (session.status === "completed") {
      return {
        processed: true,
        ignored: false,
        checkoutReference: session.reference,
        orderId: session.orderId
      };
    }

    const verification = await this.paymentProvider.verifyTransaction(
      payload.data.reference
    );

    try {
      const result = await this.completeCheckoutAfterPayment.execute({
        reference: payload.data.reference,
        verification
      });

      return {
        processed: true,
        ignored: false,
        checkoutReference: result.checkoutReference,
        orderId: result.orderId
      };
    } catch (error) {
      if (error instanceof CompleteCheckoutAfterPaymentError) {
        throw new HandlePaystackWebhookError(
          error.message,
          error.statusCode,
          error.field
        );
      }

      throw error;
    }
  }
}

