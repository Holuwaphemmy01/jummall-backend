import { describe, expect, it, jest } from "@jest/globals";

import {
  GetCheckoutStatus,
  GetCheckoutStatusError
} from "../../../src/application/checkout/get-checkout-status";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  CheckoutSessionDetailRecord,
  CheckoutSessionRepository
} from "../../../src/ports/checkout-session-repository";
import type { PaymentProvider } from "../../../src/ports/payment/payment-provider";
import type { CompleteCheckoutAfterPayment } from "../../../src/application/checkout/complete-checkout-after-payment";

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  async findByEmail(): Promise<AuthUser | null> {
    return null;
  }

  async findById(): Promise<AuthUser | null> {
    return {
      id: "buyer-1",
      firstName: "Buyer",
      lastName: "One",
      username: "buyer",
      email: "buyer@example.com",
      phone: null,
      passwordHash: "hash",
      role: "buyer",
      accountStatus: "active",
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      updatedAt: new Date("2026-04-05T00:00:00.000Z")
    };
  }

  async updatePassword(): Promise<void> {}
}

describe("get checkout status", () => {
  it("returns the existing completed checkout status", async () => {
    const useCase = new GetCheckoutStatus(
      new AuthenticationRepositoryDouble(),
      {
        create: jest.fn(),
        findInitializedByBuyerId: jest.fn(),
        findByReference: jest.fn(async () => makeCompletedSession()),
        updatePaymentInitialization: jest.fn(),
        markCompleted: jest.fn(),
        markFailed: jest.fn()
      } as unknown as CheckoutSessionRepository,
      {
        name: "paystack",
        initializeTransaction: jest.fn(),
        verifyTransaction: jest.fn(),
        validateWebhookSignature: jest.fn()
      } as unknown as PaymentProvider,
      {
        execute: jest.fn()
      } as unknown as CompleteCheckoutAfterPayment
    );

    const result = await useCase.execute({
      buyerId: "buyer-1",
      reference: "chk_1"
    });

    expect(result).toEqual({
      checkoutReference: "chk_1",
      status: "completed",
      paymentProvider: "paystack",
      paymentReference: "chk_1",
      orderId: "order-1",
      failureReason: null
    });
  });

  it("verifies and finalizes an initialized checkout when payment already succeeded", async () => {
    const findByReference = jest
      .fn<() => Promise<CheckoutSessionDetailRecord | null>>()
      .mockResolvedValueOnce(makeInitializedSession())
      .mockResolvedValueOnce(makeCompletedSession());
    const checkoutSessionRepository = {
      create: jest.fn(),
      findInitializedByBuyerId: jest.fn(),
      findByReference,
      updatePaymentInitialization: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn()
    } as unknown as CheckoutSessionRepository;
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
      validateWebhookSignature: jest.fn()
    } as unknown as PaymentProvider;
    const completeCheckoutAfterPayment = {
      execute: jest.fn(async () => ({
        checkoutReference: "chk_1",
        status: "completed" as const,
        orderId: "order-1"
      }))
    } as unknown as CompleteCheckoutAfterPayment;
    const useCase = new GetCheckoutStatus(
      new AuthenticationRepositoryDouble(),
      checkoutSessionRepository,
      paymentProvider,
      completeCheckoutAfterPayment
    );

    const result = await useCase.execute({
      buyerId: "buyer-1",
      reference: "chk_1"
    });

    expect(paymentProvider.verifyTransaction).toHaveBeenCalledWith("chk_1");
    expect(completeCheckoutAfterPayment.execute).toHaveBeenCalled();
    expect(result.status).toBe("completed");
    expect(result.orderId).toBe("order-1");
  });

  it("rejects when the checkout reference does not belong to the buyer", async () => {
    const useCase = new GetCheckoutStatus(
      new AuthenticationRepositoryDouble(),
      {
        create: jest.fn(),
        findInitializedByBuyerId: jest.fn(),
        findByReference: jest.fn(async () => ({
          ...makeInitializedSession(),
          buyerId: "another-buyer"
        })),
        updatePaymentInitialization: jest.fn(),
        markCompleted: jest.fn(),
        markFailed: jest.fn()
      } as unknown as CheckoutSessionRepository,
      {
        name: "paystack",
        initializeTransaction: jest.fn(),
        verifyTransaction: jest.fn(),
        validateWebhookSignature: jest.fn()
      } as unknown as PaymentProvider,
      {
        execute: jest.fn()
      } as unknown as CompleteCheckoutAfterPayment
    );

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        reference: "chk_1"
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Checkout session not found.",
        statusCode: 404
      })
    );
  });
});

function makeInitializedSession(): CheckoutSessionDetailRecord {
  return {
    id: "session-1",
    reference: "chk_1",
    buyerId: "buyer-1",
    cartId: "cart-1",
    orderId: null,
    paymentProvider: "paystack",
    authorizationUrl: "https://paystack.test/authorize",
    accessCode: "access-code",
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
  };
}

function makeCompletedSession(): CheckoutSessionDetailRecord {
  return {
    ...makeInitializedSession(),
    status: "completed",
    orderId: "order-1",
    completedAt: new Date("2026-04-05T10:00:00.000Z")
  };
}
