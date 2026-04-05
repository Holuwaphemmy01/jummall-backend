import { describe, expect, it } from "@jest/globals";

import {
  PrepareCheckoutData,
  PrepareCheckoutDataError
} from "../../../src/application/checkout/prepare-checkout-data";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  BillingAddressRecord,
  BillingAddressRepository
} from "../../../src/ports/billing-address-repository";
import type {
  CartItemRecord,
  CartRecord,
  CartRepository
} from "../../../src/ports/cart-repository";
import type { ProductRecord, ProductRepository } from "../../../src/ports/product-repository";
import type {
  CalculateCartShippingResult,
  CalculateCartShippingUseCase
} from "../../../src/application/shipping/calculate-cart-shipping";

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

class BillingAddressRepositoryDouble implements BillingAddressRepository {
  constructor(private readonly address: BillingAddressRecord | null = makeAddress()) {}

  async create(): Promise<never> {
    throw new Error("Not implemented.");
  }

  async findByBuyerId() {
    return this.address ? [this.address] : [];
  }

  async findByIdAndBuyerId(): Promise<BillingAddressRecord | null> {
    return this.address;
  }

  async deleteByIdAndBuyerId() {
    return null;
  }
}

class CartRepositoryDouble implements CartRepository {
  constructor(
    private readonly cart: CartRecord | null = makeCart(),
    private readonly items: CartItemRecord[] = [makeCartItem()]
  ) {}

  async findActiveByBuyerId() {
    return this.cart;
  }

  async createCart(): Promise<never> {
    throw new Error("Not implemented.");
  }

  async findItemsByCartId() {
    return this.items;
  }

  async clearItemsByCartId() {
    return 0;
  }

  async findItemByCartIdAndProductId() {
    return null;
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
  constructor(private readonly product: ProductRecord | null = makeProduct()) {}

  async create(): Promise<never> {
    throw new Error("Not implemented.");
  }

  async findById() {
    return this.product;
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

class CalculateCartShippingUseCaseDouble implements CalculateCartShippingUseCase {
  constructor(
    private readonly result: CalculateCartShippingResult = makeShippingResult(),
    private readonly error: Error | null = null
  ) {}

  async execute(): Promise<CalculateCartShippingResult> {
    if (this.error) {
      throw this.error;
    }

    return this.result;
  }
}

describe("prepare checkout data", () => {
  it("builds a complete order summary from cart, billing address, and shipping", async () => {
    const useCase = new PrepareCheckoutData(
      new AuthenticationRepositoryDouble(),
      new BillingAddressRepositoryDouble(),
      new CartRepositoryDouble(),
      new ProductRepositoryDouble(),
      new CalculateCartShippingUseCaseDouble()
    );

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      discountedSubtotal: 9500
    });

    expect(result.buyer.email).toBe("buyer@example.com");
    expect(result.summary.totalPayable).toBe(10500);
    expect(result.summary.items[0]).toMatchObject({
      sellerId: "seller-1",
      categoryName: "Electronics",
      lineSubtotal: 10000
    });
    expect(result.summary.billingAddress.city).toBe("Ikeja");
  });

  it("throws when the billing address does not belong to the buyer", async () => {
    const useCase = new PrepareCheckoutData(
      new AuthenticationRepositoryDouble(),
      new BillingAddressRepositoryDouble(null),
      new CartRepositoryDouble(),
      new ProductRepositoryDouble(),
      new CalculateCartShippingUseCaseDouble()
    );

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        billingAddressId: "missing-address",
        discountedSubtotal: 9500
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Billing address not found.",
        statusCode: 404,
        field: "billing_address_id"
      })
    );
  });

  it("throws when the active cart is empty", async () => {
    const useCase = new PrepareCheckoutData(
      new AuthenticationRepositoryDouble(),
      new BillingAddressRepositoryDouble(),
      new CartRepositoryDouble(makeCart(), []),
      new ProductRepositoryDouble(),
      new CalculateCartShippingUseCaseDouble()
    );

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        billingAddressId: "address-1",
        discountedSubtotal: 0
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Active cart is empty.",
        statusCode: 409
      })
    );
  });
});

function makeCart(): CartRecord {
  return {
    id: "cart-1",
    buyerId: "buyer-1",
    status: "active",
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T00:00:00.000Z")
  };
}

function makeCartItem(): CartItemRecord {
  return {
    id: "cart-item-1",
    cartId: "cart-1",
    productId: "product-1",
    quantity: 1,
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T00:00:00.000Z")
  };
}

function makeAddress(): BillingAddressRecord {
  return {
    id: "address-1",
    buyerId: "buyer-1",
    fullName: "Buyer One",
    phoneNumber: "08000000000",
    addressLine1: "1 Buyer St",
    addressLine2: null,
    city: "Ikeja",
    state: "Lagos",
    country: "Nigeria",
    postalCode: null,
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T00:00:00.000Z")
  };
}

function makeProduct(): ProductRecord {
  return {
    id: "product-1",
    sellerId: "seller-1",
    categoryId: "category-1",
    categoryName: "Electronics",
    brandId: "brand-1",
    brandName: "Apple",
    name: "Phone",
    description: "Phone",
    sku: "PHONE-1",
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

function makeShippingResult(): CalculateCartShippingResult {
  return {
    cartId: "cart-1",
    currency: "NGN",
    rawSubtotal: 10000,
    discountedSubtotal: 9500,
    totalItems: 1,
    shippingMode: "PLATFORM",
    categoryShippingMode: "HIGHEST",
    baseShippingFee: 1000,
    finalShippingFee: 1000,
    freeShipping: {
      applied: false,
      ruleId: null,
      ruleType: null,
      couponCode: null
    },
    breakdown: [
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
    ]
  };
}
