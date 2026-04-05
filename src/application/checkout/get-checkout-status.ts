import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { CheckoutSessionRepository } from "../../ports/checkout-session-repository";
import type { PaymentProvider } from "../../ports/payment/payment-provider";
import {
  CompleteCheckoutAfterPayment,
  CompleteCheckoutAfterPaymentError
} from "./complete-checkout-after-payment";

export interface GetCheckoutStatusInput {
  buyerId: string;
  reference: string;
}

export interface GetCheckoutStatusResult {
  checkoutReference: string;
  status: "initialized" | "completed" | "failed";
  paymentProvider: string;
  paymentReference: string;
  orderId: string | null;
  failureReason: string | null;
}

export interface GetCheckoutStatusUseCase {
  execute(input: GetCheckoutStatusInput): Promise<GetCheckoutStatusResult>;
}

export class GetCheckoutStatusError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "GetCheckoutStatusError";
  }
}

export class GetCheckoutStatus implements GetCheckoutStatusUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly checkoutSessionRepository: CheckoutSessionRepository,
    private readonly paymentProvider: PaymentProvider,
    private readonly completeCheckoutAfterPayment: CompleteCheckoutAfterPayment
  ) {}

  async execute(input: GetCheckoutStatusInput): Promise<GetCheckoutStatusResult> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new GetCheckoutStatusError("Buyer account not found.", 404, "buyer_id");
    }

    if (buyer.role !== "buyer") {
      throw new GetCheckoutStatusError(
        "Only buyers can view checkout status.",
        403,
        "buyer_id"
      );
    }

    let session = await this.checkoutSessionRepository.findByReference(
      input.reference
    );

    if (!session || session.buyerId !== input.buyerId) {
      throw new GetCheckoutStatusError(
        "Checkout session not found.",
        404,
        "reference"
      );
    }

    if (session.status === "initialized") {
      const verification = await this.paymentProvider.verifyTransaction(
        input.reference
      );

      if (verification.status === "success") {
        try {
          const finalized = await this.completeCheckoutAfterPayment.execute({
            reference: input.reference,
            verification
          });

          session = await this.checkoutSessionRepository.findByReference(
            finalized.checkoutReference
          );

          if (!session) {
            throw new GetCheckoutStatusError(
              "Checkout session not found.",
              404,
              "reference"
            );
          }
        } catch (error) {
          if (error instanceof CompleteCheckoutAfterPaymentError) {
            throw new GetCheckoutStatusError(
              error.message,
              error.statusCode,
              error.field
            );
          }

          throw error;
        }
      }
    }

    return {
      checkoutReference: session.reference,
      status: session.status,
      paymentProvider: session.paymentProvider,
      paymentReference: session.reference,
      orderId: session.orderId,
      failureReason: session.failureReason
    };
  }
}
