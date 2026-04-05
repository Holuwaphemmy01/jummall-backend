import type { CheckoutSessionRepository } from "../../ports/checkout-session-repository";
import type { CheckoutTransactionRunner } from "../../ports/checkout-transaction-runner";
import type { VerifyPaymentTransactionResult } from "../../ports/payment/payment-provider";

export interface CompleteCheckoutAfterPaymentInput {
  reference: string;
  verification: VerifyPaymentTransactionResult;
}

export interface CompleteCheckoutAfterPaymentResult {
  checkoutReference: string;
  status: "completed";
  orderId: string;
}

export interface CompleteCheckoutAfterPaymentUseCase {
  execute(
    input: CompleteCheckoutAfterPaymentInput
  ): Promise<CompleteCheckoutAfterPaymentResult>;
}

export class CompleteCheckoutAfterPaymentError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "CompleteCheckoutAfterPaymentError";
  }
}

class FinalizationFailure extends Error {
  constructor(
    public readonly sessionId: string,
    public readonly messageText: string,
    public readonly failureReason: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(messageText);
    this.name = "FinalizationFailure";
  }
}

export class CompleteCheckoutAfterPayment
  implements CompleteCheckoutAfterPaymentUseCase
{
  constructor(
    private readonly checkoutSessionRepository: CheckoutSessionRepository,
    private readonly checkoutTransactionRunner: CheckoutTransactionRunner
  ) {}

  async execute(
    input: CompleteCheckoutAfterPaymentInput
  ): Promise<CompleteCheckoutAfterPaymentResult> {
    const existingSession =
      await this.checkoutSessionRepository.findByReference(input.reference);

    if (!existingSession) {
      throw new CompleteCheckoutAfterPaymentError(
        "Checkout session not found.",
        404,
        "reference"
      );
    }

    if (existingSession.status === "completed" && existingSession.orderId) {
      return {
        checkoutReference: existingSession.reference,
        status: "completed",
        orderId: existingSession.orderId
      };
    }

    if (existingSession.status === "failed") {
      throw new CompleteCheckoutAfterPaymentError(
        "Checkout session has already failed.",
        409,
        "reference"
      );
    }

    if (input.verification.status !== "success") {
      throw new CompleteCheckoutAfterPaymentError(
        "Payment has not completed successfully.",
        409,
        "reference"
      );
    }

    if (input.verification.reference !== existingSession.reference) {
      await this.checkoutSessionRepository.markFailed({
        sessionId: existingSession.id,
        failureReason: "payment_reference_mismatch"
      });
      throw new CompleteCheckoutAfterPaymentError(
        "Payment reference does not match the checkout session.",
        409,
        "reference"
      );
    }

    if (input.verification.currency !== existingSession.currency) {
      await this.checkoutSessionRepository.markFailed({
        sessionId: existingSession.id,
        failureReason: "payment_currency_mismatch"
      });
      throw new CompleteCheckoutAfterPaymentError(
        "Payment currency does not match the checkout session.",
        409,
        "currency"
      );
    }

    if (input.verification.amount !== existingSession.totalPayable) {
      await this.checkoutSessionRepository.markFailed({
        sessionId: existingSession.id,
        failureReason: "payment_amount_mismatch"
      });
      throw new CompleteCheckoutAfterPaymentError(
        "Payment amount does not match the checkout session.",
        409,
        "amount"
      );
    }

    try {
      return await this.checkoutTransactionRunner.run(async (context) => {
        const session = await context.checkoutSessionRepository.findByReference(
          input.reference
        );

        if (!session) {
          throw new CompleteCheckoutAfterPaymentError(
            "Checkout session not found.",
            404,
            "reference"
          );
        }

        if (session.status === "completed" && session.orderId) {
          return {
            checkoutReference: session.reference,
            status: "completed" as const,
            orderId: session.orderId
          };
        }

        if (session.status === "failed") {
          throw new CompleteCheckoutAfterPaymentError(
            "Checkout session has already failed.",
            409,
            "reference"
          );
        }

        for (const item of session.items) {
          const product = await context.productRepository.findById(item.productId);

          if (!product || product.status !== "approved") {
            throw new FinalizationFailure(
              session.id,
              "Product is no longer available after payment.",
              "product_unavailable_after_payment",
              409,
              "product_id"
            );
          }

          if (product.quantity < item.quantity) {
            throw new FinalizationFailure(
              session.id,
              "Product stock changed after payment.",
              "stock_conflict_after_payment",
              409,
              "quantity"
            );
          }
        }

        await context.inventoryRepository.decrementAvailableQuantities(
          session.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        );

        const order = await context.orderRepository.create({
          checkoutSessionId: session.id,
          buyerId: session.buyerId,
          paymentProvider: session.paymentProvider,
          paymentReference: session.reference,
          currency: session.currency,
          totalItems: session.totalItems,
          rawSubtotal: session.rawSubtotal,
          discountedSubtotal: session.discountedSubtotal,
          baseShippingFee: session.baseShippingFee,
          finalShippingFee: session.finalShippingFee,
          totalPaid: session.totalPayable,
          shippingMode: session.shippingMode,
          categoryShippingMode: session.categoryShippingMode,
          freeShippingApplied: session.freeShippingApplied,
          freeShippingRuleId: session.freeShippingRuleId,
          freeShippingRuleType: session.freeShippingRuleType,
          freeShippingCouponCode: session.freeShippingCouponCode,
          paidAt: input.verification.paidAt,
          billingAddress: session.billingAddress,
          items: session.items.map((item) => ({
            productId: item.productId,
            sellerId: item.sellerId,
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            brandId: item.brandId,
            brandName: item.brandName,
            productName: item.productName,
            productDescription: item.productDescription,
            sku: item.sku,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            lineSubtotal: item.lineSubtotal,
            currency: item.currency,
            condition: item.condition,
            weightKg: item.weightKg
          })),
          shippingSegments: session.shippingBreakdown.map((segment) => ({
            sellerId: segment.sellerId,
            ruleOwnerType: segment.ruleOwnerType,
            finalShippingOwnerType: segment.finalShippingOwnerType,
            usedFallback: segment.usedFallback,
            matchedZoneId: segment.matchedZone.id,
            matchedZoneName: segment.matchedZone.name,
            matchedZoneMatchType: segment.matchedZone.matchType,
            zoneFee: segment.zoneFee,
            categoryFee: segment.categoryFee,
            baseShippingFee: segment.baseShippingFee,
            finalShippingFee: segment.finalShippingFee
          }))
        });

        await context.cartRepository.clearItemsByCartId(session.cartId);
        await context.checkoutSessionRepository.markCompleted({
          sessionId: session.id,
          orderId: order.id
        });

        return {
          checkoutReference: session.reference,
          status: "completed" as const,
          orderId: order.id
        };
      });
    } catch (error) {
      if (error instanceof FinalizationFailure) {
        await this.checkoutSessionRepository.markFailed({
          sessionId: error.sessionId,
          failureReason: error.failureReason
        });

        throw new CompleteCheckoutAfterPaymentError(
          error.messageText,
          error.statusCode,
          error.field
        );
      }

      if (error instanceof CompleteCheckoutAfterPaymentError) {
        throw error;
      }

      if (existingSession.status === "initialized") {
        await this.checkoutSessionRepository.markFailed({
          sessionId: existingSession.id,
          failureReason: "checkout_finalization_failed"
        });
      }

      throw new CompleteCheckoutAfterPaymentError(
        "Unable to finalize checkout after payment.",
        500
      );
    }
  }
}
