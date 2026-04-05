import { describe, expect, it, jest } from "@jest/globals";

import {
  HandlePaystackWebhook,
  HandlePaystackWebhookError
} from "../../../src/application/checkout/handle-paystack-webhook";
import type { CompleteCheckoutAfterPayment } from "../../../src/application/checkout/complete-checkout-after-payment";
import type { CheckoutSessionRepository } from "../../../src/ports/checkout-session-repository";
import type { PaymentProvider } from "../../../src/ports/payment/payment-provider";

describe("handle paystack webhook", () => {
  it("rejects an invalid webhook signature", async () => {
    const useCase = new HandlePaystackWebhook(
      {
        name: "paystack",
        initializeTransaction: jest.fn(),
        verifyTransaction: jest.fn(),
        validateWebhookSignature: jest.fn(() => false)
      } as unknown as PaymentProvider,
      {
        create: jest.fn(),
        findInitializedByBuyerId: jest.fn(),
        findByReference: jest.fn(),
        updatePaymentInitialization: jest.fn(),
        markCompleted: jest.fn(),
        markFailed: jest.fn()
      } as unknown as CheckoutSessionRepository,
      {
        execute: jest.fn()
      } as unknown as CompleteCheckoutAfterPayment
    );

    await expect(
      useCase.execute({
        rawBody: JSON.stringify({ event: "charge.success", data: { reference: "chk_1" } }),
        signature: "bad-signature"
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Invalid webhook signature.",
        statusCode: 401
      })
    );
  });

  it("verifies and finalizes a successful charge event", async () => {
    const paymentProvider = {
      name: "paystack",
      initializeTransaction: jest.fn(),
      verifyTransaction: jest.fn(async () => ({
        provider: "paystack" as const,
        reference: "chk_1",
        amount: 10500,
        currency: "NGN",
        status: "success" as const,
        paidAt: new Date("2026-04-05T10:00:00.000Z")
      })),
      validateWebhookSignature: jest.fn(() => true)
    } as unknown as PaymentProvider;
    const useCase = new HandlePaystackWebhook(
      paymentProvider,
      {
        create: jest.fn(),
        findInitializedByBuyerId: jest.fn(),
        findByReference: jest.fn(async () => ({
          id: "session-1",
          reference: "chk_1",
          buyerId: "buyer-1",
          cartId: "cart-1",
          orderId: null,
          paymentProvider: "paystack",
          authorizationUrl: null,
          accessCode: null,
          status: "initialized",
          failureReason: null,
          currency: "NGN",
          totalItems: 1,
          rawSubtotal: 10000,
          discountedSubtotal: 9500,
          baseShippingFee: 1000,
          finalShippingFee: 1000,
          totalPayable: 10500,
          shippingMode: "PLATFORM",
          categoryShippingMode: "HIGHEST",
          freeShippingApplied: false,
          freeShippingRuleId: null,
          freeShippingRuleType: null,
          freeShippingCouponCode: null,
          billingAddress: {
            fullName: "Buyer One",
            phoneNumber: "08000000000",
            addressLine1: "1 Buyer St",
            addressLine2: null,
            city: "Ikeja",
            state: "Lagos",
            country: "Nigeria",
            postalCode: null
          },
          shippingBreakdown: [],
          createdAt: new Date("2026-04-05T00:00:00.000Z"),
          updatedAt: new Date("2026-04-05T00:00:00.000Z"),
          completedAt: null,
          items: []
        })),
        updatePaymentInitialization: jest.fn(),
        markCompleted: jest.fn(),
        markFailed: jest.fn()
      } as unknown as CheckoutSessionRepository,
      {
        execute: jest.fn(async () => ({
          checkoutReference: "chk_1",
          status: "completed" as const,
          orderId: "order-1"
        }))
      } as unknown as CompleteCheckoutAfterPayment
    );

    const result = await useCase.execute({
      rawBody: JSON.stringify({ event: "charge.success", data: { reference: "chk_1" } }),
      signature: "good-signature"
    });

    expect(paymentProvider.verifyTransaction).toHaveBeenCalledWith("chk_1");
    expect(result).toEqual({
      processed: true,
      ignored: false,
      checkoutReference: "chk_1",
      orderId: "order-1"
    });
  });
});
