import { describe, expect, it, jest } from "@jest/globals";

import {
  InitializeCheckout,
  InitializeCheckoutError
} from "../../../src/application/checkout/initialize-checkout";
import type {
  CheckoutSessionDetailRecord,
  CheckoutSessionRecord,
  CheckoutSessionRepository
} from "../../../src/ports/checkout-session-repository";
import type {
  InitializePaymentTransactionResult,
  PaymentProvider
} from "../../../src/ports/payment/payment-provider";
import type { CheckoutOrderSummary } from "../../../src/application/checkout/checkout-types";
import type { PrepareCheckoutData } from "../../../src/application/checkout/prepare-checkout-data";

describe("initialize checkout", () => {
  it("creates a checkout session and initializes payment", async () => {
    const checkoutSessionRepository = createCheckoutSessionRepositoryDouble();
    const paymentProvider = createPaymentProviderDouble();
    const prepareCheckoutData = {
      execute: jest.fn(async () => ({
        buyer: {
          id: "buyer-1",
          email: "buyer@example.com"
        },
        summary: makeSummary()
      }))
    } as unknown as PrepareCheckoutData;
    const useCase = new InitializeCheckout(
      prepareCheckoutData,
      checkoutSessionRepository,
      paymentProvider
    );

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      freeShippingCouponCode: "SAVE"
    });

    expect(checkoutSessionRepository.create).toHaveBeenCalled();
    expect(paymentProvider.initializeTransaction).toHaveBeenCalled();
    expect(result.summary.totalPayable).toBe(10500);
    expect(result.authorizationUrl).toBe("https://paystack.test/authorize");
  });

  it("blocks initialization when another checkout session is already open", async () => {
    const checkoutSessionRepository = createCheckoutSessionRepositoryDouble({
      existingSession: makeSession()
    });
    const useCase = new InitializeCheckout(
      {
        execute: jest.fn()
      } as unknown as PrepareCheckoutData,
      checkoutSessionRepository,
      createPaymentProviderDouble()
    );

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        billingAddressId: "address-1"
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: "A checkout session is already awaiting payment.",
        statusCode: 409
      })
    );
  });
});

function createCheckoutSessionRepositoryDouble(options?: {
  existingSession?: CheckoutSessionRecord | null;
}): CheckoutSessionRepository & {
  create: jest.Mock;
  updatePaymentInitialization: jest.Mock;
} {
  const createdSession = makeSession();

  return {
    create: jest.fn(async () => ({
      ...createdSession,
      items: []
    })),
    findInitializedByBuyerId: jest.fn(async () => options?.existingSession ?? null),
    findByReference: jest.fn(async () => ({
      ...createdSession,
      items: []
    })),
    updatePaymentInitialization: jest.fn(async () => createdSession),
    markCompleted: jest.fn(async () => createdSession),
    markFailed: jest.fn(async () => createdSession)
  };
}

function createPaymentProviderDouble(): PaymentProvider & {
  initializeTransaction: jest.Mock<() => Promise<InitializePaymentTransactionResult>>;
} {
  return {
    name: "paystack",
    initializeTransaction: jest.fn(async () => ({
      provider: "paystack",
      reference: "chk_1",
      authorizationUrl: "https://paystack.test/authorize",
      accessCode: "access-code"
    })),
    verifyTransaction: jest.fn(async () => ({
      provider: "paystack" as const,
      reference: "chk_1",
      amount: 10500,
      currency: "NGN",
      status: "success" as const,
      paidAt: new Date("2026-04-05T10:00:00.000Z")
    })),
    validateWebhookSignature: jest.fn(() => true)
  };
}

function makeSummary(): CheckoutOrderSummary {
  return {
    cartId: "cart-1",
    billingAddress: {
      id: "address-1",
      fullName: "Buyer One",
      phoneNumber: "08000000000",
      addressLine1: "1 Buyer St",
      addressLine2: null,
      city: "Ikeja",
      state: "Lagos",
      country: "Nigeria",
      postalCode: null
    },
    items: [],
    currency: "NGN",
    totalItems: 1,
    rawSubtotal: 10000,
    discountedSubtotal: 9500,
    shippingMode: "PLATFORM",
    categoryShippingMode: "HIGHEST",
    baseShippingFee: 1000,
    finalShippingFee: 1000,
    totalPayable: 10500,
    freeShipping: {
      applied: false,
      ruleId: null,
      ruleType: null,
      couponCode: null
    },
    shippingBreakdown: []
  };
}

function makeSession(): CheckoutSessionRecord {
  return {
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
    completedAt: null
  };
}
