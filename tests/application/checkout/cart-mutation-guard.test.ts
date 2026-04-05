import { describe, expect, it } from "@jest/globals";

import { AddProductToCart } from "../../../src/application/buyer/add-product-to-cart";
import { ClearBuyerCart } from "../../../src/application/buyer/clear-buyer-cart";
import { RemoveProductFromCart } from "../../../src/application/buyer/remove-product-from-cart";
import { UpdateProductQuantityInCart } from "../../../src/application/buyer/update-product-quantity-in-cart";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  CartRecord,
  CartRepository
} from "../../../src/ports/cart-repository";
import type {
  CheckoutSessionRecord,
  CheckoutSessionRepository
} from "../../../src/ports/checkout-session-repository";
import type { ProductRecord, ProductRepository } from "../../../src/ports/product-repository";

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

class CheckoutSessionRepositoryDouble implements CheckoutSessionRepository {
  constructor(private readonly session: CheckoutSessionRecord | null) {}

  async create(): Promise<never> {
    throw new Error("Not implemented.");
  }

  async findInitializedByBuyerId(): Promise<CheckoutSessionRecord | null> {
    return this.session;
  }

  async findByReference() {
    return null;
  }

  async updatePaymentInitialization() {
    return null;
  }

  async markCompleted() {
    return null;
  }

  async markFailed() {
    return null;
  }
}

class CartRepositoryDouble implements CartRepository {
  async findActiveByBuyerId(): Promise<CartRecord | null> {
    return {
      id: "cart-1",
      buyerId: "buyer-1",
      status: "active",
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      updatedAt: new Date("2026-04-05T00:00:00.000Z")
    };
  }

  async createCart(): Promise<never> {
    throw new Error("Not implemented.");
  }

  async findItemsByCartId() {
    return [];
  }

  async clearItemsByCartId() {
    return 0;
  }

  async findItemByCartIdAndProductId() {
    return {
      id: "cart-item-1",
      cartId: "cart-1",
      productId: "product-1",
      quantity: 1,
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      updatedAt: new Date("2026-04-05T00:00:00.000Z")
    };
  }

  async createCartItem(): Promise<never> {
    throw new Error("Not implemented.");
  }

  async deleteCartItem() {
    return null;
  }

  async updateCartItemQuantity() {
    return null;
  }
}

class ProductRepositoryDouble implements ProductRepository {
  async create(): Promise<never> {
    throw new Error("Not implemented.");
  }

  async findById(): Promise<ProductRecord | null> {
    return {
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
      status: "approved",
      reviewNote: null,
      reviewedAt: null,
      images: [],
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      updatedAt: new Date("2026-04-05T00:00:00.000Z")
    };
  }

  async findBySellerId() {
    return [];
  }

  async findPendingReview() {
    return [];
  }

  async updateStatus() {
    return null;
  }
}

function makeOpenSession(): CheckoutSessionRecord {
  return {
    id: "checkout-session-1",
    reference: "chk_ref_1",
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
    discountedSubtotal: 10000,
    baseShippingFee: 1000,
    finalShippingFee: 1000,
    totalPayable: 11000,
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

describe("cart mutation guard with open checkout session", () => {
  const authenticationRepository = new AuthenticationRepositoryDouble();
  const cartRepository = new CartRepositoryDouble();
  const productRepository = new ProductRepositoryDouble();
  const checkoutSessionRepository = new CheckoutSessionRepositoryDouble(
    makeOpenSession()
  );

  it("blocks add-to-cart while checkout is initialized", async () => {
    const useCase = new AddProductToCart(
      authenticationRepository,
      productRepository,
      cartRepository,
      checkoutSessionRepository
    );

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        productId: "product-1",
        quantity: 1
      })
    ).rejects.toMatchObject({
      message:
        "An active checkout session is awaiting payment. Complete or resolve it before modifying the cart.",
      statusCode: 409
    });
  });

  it("blocks quantity updates while checkout is initialized", async () => {
    const useCase = new UpdateProductQuantityInCart(
      authenticationRepository,
      productRepository,
      cartRepository,
      checkoutSessionRepository
    );

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        productId: "product-1",
        quantity: 2
      })
    ).rejects.toMatchObject({
      statusCode: 409
    });
  });

  it("blocks item removal while checkout is initialized", async () => {
    const useCase = new RemoveProductFromCart(
      authenticationRepository,
      cartRepository,
      checkoutSessionRepository
    );

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        productId: "product-1"
      })
    ).rejects.toMatchObject({
      statusCode: 409
    });
  });

  it("blocks cart clearing while checkout is initialized", async () => {
    const useCase = new ClearBuyerCart(
      authenticationRepository,
      cartRepository,
      checkoutSessionRepository
    );

    await expect(
      useCase.execute({
        buyerId: "buyer-1"
      })
    ).rejects.toMatchObject({
      statusCode: 409
    });
  });
});
