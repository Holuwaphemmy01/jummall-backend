import { describe, expect, it, jest } from "@jest/globals";

import {
  CompleteCheckoutAfterPayment,
  CompleteCheckoutAfterPaymentError
} from "../../../src/application/checkout/complete-checkout-after-payment";
import type {
  CheckoutSessionDetailRecord,
  CheckoutSessionRecord,
  CheckoutSessionRepository
} from "../../../src/ports/checkout-session-repository";
import type {
  CheckoutTransactionContext,
  CheckoutTransactionRunner
} from "../../../src/ports/checkout-transaction-runner";
import type { VerifyPaymentTransactionResult } from "../../../src/ports/payment/payment-provider";

describe("complete checkout after payment", () => {
  it("creates the order, clears the cart, and marks the session completed", async () => {
    const checkoutSessionRepository = createCheckoutSessionRepositoryDouble();
    const context = createTransactionContext();
    const transactionRunner: CheckoutTransactionRunner = {
      run: async (operation) => operation(context)
    };
    const useCase = new CompleteCheckoutAfterPayment(
      checkoutSessionRepository,
      transactionRunner
    );

    const result = await useCase.execute({
      reference: "chk_1",
      verification: makeVerification()
    });

    expect(result).toEqual({
      checkoutReference: "chk_1",
      status: "completed",
      orderId: "order-1"
    });
    expect(context.inventoryRepository.decrementAvailableQuantities).toHaveBeenCalled();
    expect(context.orderRepository.create).toHaveBeenCalled();
    expect(context.cartRepository.clearItemsByCartId).toHaveBeenCalledWith("cart-1");
  });

  it("fails when the verified amount does not match the checkout session", async () => {
    const checkoutSessionRepository = createCheckoutSessionRepositoryDouble();
    const useCase = new CompleteCheckoutAfterPayment(
      checkoutSessionRepository,
      {
        run: async () => {
          throw new Error("Should not run transaction.");
        }
      }
    );

    await expect(
      useCase.execute({
        reference: "chk_1",
        verification: {
          ...makeVerification(),
          amount: 9999
        }
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Payment amount does not match the checkout session.",
        statusCode: 409
      })
    );
    expect(checkoutSessionRepository.markFailed).toHaveBeenCalled();
  });
});

function createCheckoutSessionRepositoryDouble(): CheckoutSessionRepository & {
  markFailed: jest.Mock;
} {
  const session = makeSession();

  return {
    create: jest.fn(async () => makeSession()),
    findInitializedByBuyerId: jest.fn(async () => session),
    findByReference: jest.fn(async () => session),
    updatePaymentInitialization: jest.fn(async () => session),
    markCompleted: jest.fn(async () => ({
      ...session,
      status: "completed" as const,
      orderId: "order-1"
    })),
    markFailed: jest.fn(async () => ({
      ...session,
      status: "failed" as const,
      failureReason: "payment_amount_mismatch"
    }))
  } as CheckoutSessionRepository & {
    markFailed: jest.Mock;
  };
}

function createTransactionContext(): CheckoutTransactionContext {
  return {
    cartRepository: {
      findActiveByBuyerId: jest.fn(async () => null),
      createCart: jest.fn(async () => {
        throw new Error("Not implemented.");
      }),
      findItemsByCartId: jest.fn(async () => []),
      clearItemsByCartId: jest.fn(async () => 1),
      findItemByCartIdAndProductId: jest.fn(async () => null),
      createCartItem: jest.fn(async () => {
        throw new Error("Not implemented.");
      }),
      deleteCartItem: jest.fn(async () => null),
      updateCartItemQuantity: jest.fn(async () => null)
    },
    checkoutSessionRepository: {
      create: jest.fn(async () => makeSession()),
      findInitializedByBuyerId: jest.fn(async () => null),
      findByReference: jest.fn(async () => makeSession()),
      updatePaymentInitialization: jest.fn(async () => makeSession()),
      markCompleted: jest.fn(async () => ({
        ...makeSession(),
        status: "completed" as const,
        orderId: "order-1"
      })),
      markFailed: jest.fn(async () => ({
        ...makeSession(),
        status: "failed" as const,
        failureReason: "checkout_finalization_failed"
      }))
    },
    inventoryRepository: {
      decrementAvailableQuantities: jest.fn(async () => undefined)
    },
    orderRepository: {
      create: jest.fn(async () => ({
        id: "order-1",
        checkoutSessionId: "session-1",
        buyerId: "buyer-1",
        paymentProvider: "paystack",
        paymentReference: "chk_1",
        status: "pending_fulfillment" as const,
        currency: "NGN",
        totalItems: 1,
        rawSubtotal: 10000,
        discountedSubtotal: 9500,
        baseShippingFee: 1000,
        finalShippingFee: 1000,
        totalPaid: 10500,
        shippingMode: "PLATFORM" as const,
        categoryShippingMode: "HIGHEST" as const,
        freeShippingApplied: false,
        freeShippingRuleId: null,
        freeShippingRuleType: null,
        freeShippingCouponCode: null,
        paidAt: new Date("2026-04-05T10:00:00.000Z"),
        billingAddress: makeSession().billingAddress,
        createdAt: new Date("2026-04-05T10:00:00.000Z"),
        updatedAt: new Date("2026-04-05T10:00:00.000Z"),
        items: [],
        shippingSegments: []
      })),
      findById: jest.fn(async () => null)
    },
    productRepository: {
      create: jest.fn(async () => {
        throw new Error("Not implemented.");
      }),
      findById: jest.fn(async () => ({
        id: "product-1",
        sellerId: "seller-1",
        categoryId: "category-1",
        categoryName: "Electronics",
        brandId: null,
        brandName: null,
        name: "Phone",
        description: "Phone",
        sku: null,
        price: 10000,
        quantity: 10,
        currency: "NGN",
        condition: "new",
        weightKg: 1,
        status: "approved" as const,
        reviewNote: null,
        reviewedAt: null,
        images: [],
        createdAt: new Date("2026-04-05T00:00:00.000Z"),
        updatedAt: new Date("2026-04-05T00:00:00.000Z")
      })),
      findBySellerId: jest.fn(async () => []),
      findPendingReview: jest.fn(async () => []),
      updateStatus: jest.fn(async () => null)
    }
  } as CheckoutTransactionContext;
}

function makeSession(): CheckoutSessionDetailRecord {
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
    shippingBreakdown: [
      {
        sellerId: null,
        ruleOwnerType: "platform",
        finalShippingOwnerType: "platform",
        usedFallback: false,
        matchedZone: {
          id: "zone-1",
          name: "Lagos",
          matchType: "state"
        },
        zoneFee: 1000,
        categoryFee: 0,
        baseShippingFee: 1000,
        finalShippingFee: 1000
      }
    ],
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T00:00:00.000Z"),
    completedAt: null,
    items: [
      {
        id: "session-item-1",
        checkoutSessionId: "session-1",
        cartItemId: "cart-item-1",
        productId: "product-1",
        sellerId: "seller-1",
        categoryId: "category-1",
        categoryName: "Electronics",
        brandId: null,
        brandName: null,
        productName: "Phone",
        productDescription: "Phone",
        sku: null,
        unitPrice: 10000,
        quantity: 1,
        lineSubtotal: 10000,
        currency: "NGN",
        condition: "new",
        weightKg: 1,
        createdAt: new Date("2026-04-05T00:00:00.000Z"),
        updatedAt: new Date("2026-04-05T00:00:00.000Z")
      }
    ]
  };
}

function makeVerification(): VerifyPaymentTransactionResult {
  return {
    provider: "paystack",
    reference: "chk_1",
    amount: 10500,
    currency: "NGN",
    status: "success",
    paidAt: new Date("2026-04-05T10:00:00.000Z")
  };
}
