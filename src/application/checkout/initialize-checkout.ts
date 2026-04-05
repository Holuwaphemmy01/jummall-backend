import { randomUUID } from "node:crypto";

import type { CheckoutSessionRepository } from "../../ports/checkout-session-repository";
import type { PaymentProvider } from "../../ports/payment/payment-provider";
import type { CheckoutOrderSummary } from "./checkout-types";
import type { PrepareCheckoutDataInput } from "./prepare-checkout-data";
import {
  PrepareCheckoutData,
  PrepareCheckoutDataError
} from "./prepare-checkout-data";

export interface InitializeCheckoutInput extends PrepareCheckoutDataInput {}

export interface InitializeCheckoutResult {
  checkoutReference: string;
  authorizationUrl: string;
  accessCode: string | null;
  summary: CheckoutOrderSummary;
}

export interface InitializeCheckoutUseCase {
  execute(input: InitializeCheckoutInput): Promise<InitializeCheckoutResult>;
}

export class InitializeCheckoutError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "InitializeCheckoutError";
  }
}

export class InitializeCheckout implements InitializeCheckoutUseCase {
  constructor(
    private readonly prepareCheckoutData: PrepareCheckoutData,
    private readonly checkoutSessionRepository: CheckoutSessionRepository,
    private readonly paymentProvider: PaymentProvider
  ) {}

  async execute(
    input: InitializeCheckoutInput
  ): Promise<InitializeCheckoutResult> {
    const existingSession =
      await this.checkoutSessionRepository.findInitializedByBuyerId(input.buyerId);

    if (existingSession) {
      throw new InitializeCheckoutError(
        "A checkout session is already awaiting payment.",
        409,
        "buyer_id"
      );
    }

    try {
      const prepared = await this.prepareCheckoutData.execute(input);
      const checkoutReference = this.generateReference();

      const session = await this.checkoutSessionRepository.create({
        reference: checkoutReference,
        buyerId: prepared.buyer.id,
        cartId: prepared.summary.cartId,
        paymentProvider: this.paymentProvider.name,
        currency: prepared.summary.currency,
        totalItems: prepared.summary.totalItems,
        rawSubtotal: prepared.summary.rawSubtotal,
        discountedSubtotal: prepared.summary.discountedSubtotal,
        baseShippingFee: prepared.summary.baseShippingFee,
        finalShippingFee: prepared.summary.finalShippingFee,
        totalPayable: prepared.summary.totalPayable,
        shippingMode: prepared.summary.shippingMode,
        categoryShippingMode: prepared.summary.categoryShippingMode,
        freeShippingApplied: prepared.summary.freeShipping.applied,
        freeShippingRuleId: prepared.summary.freeShipping.ruleId,
        freeShippingRuleType: prepared.summary.freeShipping.ruleType,
        freeShippingCouponCode: prepared.summary.freeShipping.couponCode,
        billingAddress: {
          fullName: prepared.summary.billingAddress.fullName,
          phoneNumber: prepared.summary.billingAddress.phoneNumber,
          addressLine1: prepared.summary.billingAddress.addressLine1,
          addressLine2: prepared.summary.billingAddress.addressLine2,
          city: prepared.summary.billingAddress.city,
          state: prepared.summary.billingAddress.state,
          country: prepared.summary.billingAddress.country,
          postalCode: prepared.summary.billingAddress.postalCode
        },
        shippingBreakdown: prepared.summary.shippingBreakdown,
        items: prepared.summary.items.map((item) => ({
          cartItemId: item.cartItemId,
          productId: item.productId,
          sellerId: item.sellerId,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          brandId: item.brandId,
          brandName: item.brandName,
          productName: item.name,
          productDescription: item.description,
          sku: item.sku,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineSubtotal: item.lineSubtotal,
          currency: item.currency,
          condition: item.condition,
          weightKg: item.weightKg
        }))
      });

      try {
        const initializedTransaction =
          await this.paymentProvider.initializeTransaction({
            reference: checkoutReference,
            amount: prepared.summary.totalPayable,
            currency: prepared.summary.currency,
            customerEmail: prepared.buyer.email,
            metadata: {
              buyerId: prepared.buyer.id,
              checkoutSessionId: session.id
            }
          });

        await this.checkoutSessionRepository.updatePaymentInitialization({
          sessionId: session.id,
          authorizationUrl: initializedTransaction.authorizationUrl,
          accessCode: initializedTransaction.accessCode
        });

        return {
          checkoutReference,
          authorizationUrl: initializedTransaction.authorizationUrl,
          accessCode: initializedTransaction.accessCode,
          summary: prepared.summary
        };
      } catch (error) {
        await this.checkoutSessionRepository.markFailed({
          sessionId: session.id,
          failureReason: "payment_initialization_failed"
        });
        throw error;
      }
    } catch (error) {
      if (error instanceof PrepareCheckoutDataError) {
        throw new InitializeCheckoutError(
          error.message,
          error.statusCode,
          error.field
        );
      }

      if (error instanceof InitializeCheckoutError) {
        throw error;
      }

      throw new InitializeCheckoutError(
        "Unable to initialize checkout payment.",
        502
      );
    }
  }

  private generateReference(): string {
    return `chk_${Date.now()}_${randomUUID().replace(/-/g, "")}`;
  }
}

