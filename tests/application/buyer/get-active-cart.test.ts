import { describe, expect, it, jest } from "@jest/globals";

import {
  GetActiveCart,
  GetActiveCartError
} from "../../../src/application/buyer/get-active-cart";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  CartItemRecord,
  CartRecord,
  CartRepository,
  CreateCartInput,
  CreateCartItemInput,
  UpdateCartItemQuantityInput
} from "../../../src/ports/cart-repository";
import type {
  CreateProductInput,
  ProductRecord,
  ProductRepository,
  UpdateProductStatusInput
} from "../../../src/ports/product-repository";

function makeBuyer(): AuthUser {
  return {
    id: "buyer-id",
    firstName: "John",
    lastName: "Doe",
    username: "john.doe",
    email: "john@example.com",
    phone: "+2348012345678",
    passwordHash: "hashed-password",
    role: "buyer",
    accountStatus: "verified",
    createdAt: new Date("2026-03-30T00:00:00.000Z"),
    updatedAt: new Date("2026-03-30T00:00:00.000Z")
  };
}

function makeActiveCart(overrides: Partial<CartRecord> = {}): CartRecord {
  return {
    id: "cart-id",
    buyerId: "buyer-id",
    status: "active",
    createdAt: new Date("2026-03-30T00:00:00.000Z"),
    updatedAt: new Date("2026-03-30T00:00:00.000Z"),
    ...overrides
  };
}

function makeCartItem(overrides: Partial<CartItemRecord> = {}): CartItemRecord {
  return {
    id: "cart-item-id",
    cartId: "cart-id",
    productId: "product-id",
    quantity: 2,
    createdAt: new Date("2026-03-30T00:00:00.000Z"),
    updatedAt: new Date("2026-03-30T00:00:00.000Z"),
    ...overrides
  };
}

function makeProduct(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: "product-id",
    sellerId: "seller-id",
    categoryId: "category-id",
    brandId: "brand-id",
    brandName: "Apple",
    name: "Wireless Headset",
    description: "Noise-cancelling wireless headset",
    sku: "HEADSET-001",
    price: 85000,
    quantity: 10,
    currency: "NGN",
    condition: "new",
    weightKg: 0.4,
    status: "approved",
    reviewNote: null,
    reviewedAt: new Date("2026-03-30T00:00:00.000Z"),
    images: [
      {
        id: "image-id",
        productId: "product-id",
        storagePath: "products/seller-id/product-id/front.jpg",
        mimeType: "image/jpeg",
        originalFileName: "front.jpg",
        position: 0,
        createdAt: new Date("2026-03-30T00:00:00.000Z"),
        updatedAt: new Date("2026-03-30T00:00:00.000Z")
      }
    ],
    createdAt: new Date("2026-03-30T00:00:00.000Z"),
    updatedAt: new Date("2026-03-30T00:00:00.000Z"),
    ...overrides
  };
}

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  findByEmail = jest
    .fn<(email: string) => Promise<AuthUser | null>>()
    .mockResolvedValue(null);

  findById = jest
    .fn<(userId: string) => Promise<AuthUser | null>>()
    .mockResolvedValue(makeBuyer());

  updatePassword = jest
    .fn<(input: { userId: string; passwordHash: string }) => Promise<void>>()
    .mockResolvedValue();
}

class CartRepositoryDouble implements CartRepository {
  findActiveByBuyerId = jest
    .fn<(buyerId: string) => Promise<CartRecord | null>>()
    .mockResolvedValue(makeActiveCart());

  createCart = jest
    .fn<(input: CreateCartInput) => Promise<CartRecord>>()
    .mockResolvedValue(makeActiveCart());

  findItemsByCartId = jest
    .fn<(cartId: string) => Promise<CartItemRecord[]>>()
    .mockResolvedValue([makeCartItem()]);

  findItemByCartIdAndProductId = jest
    .fn<(cartId: string, productId: string) => Promise<CartItemRecord | null>>()
    .mockResolvedValue(makeCartItem());

  createCartItem = jest
    .fn<(input: CreateCartItemInput) => Promise<CartItemRecord>>()
    .mockResolvedValue(makeCartItem());

  deleteCartItem = jest
    .fn<(cartItemId: string) => Promise<CartItemRecord | null>>()
    .mockResolvedValue(makeCartItem());

  updateCartItemQuantity = jest
    .fn<
      (input: UpdateCartItemQuantityInput) => Promise<CartItemRecord | null>
    >()
    .mockResolvedValue(makeCartItem());
}

class ProductRepositoryDouble implements ProductRepository {
  create = jest
    .fn<(input: CreateProductInput) => Promise<ProductRecord>>()
    .mockResolvedValue(makeProduct());

  findById = jest
    .fn<(productId: string) => Promise<ProductRecord | null>>()
    .mockResolvedValue(makeProduct());

  findBySellerId = jest
    .fn<(sellerId: string) => Promise<ProductRecord[]>>()
    .mockResolvedValue([]);

  findPendingReview = jest.fn<() => Promise<ProductRecord[]>>().mockResolvedValue([]);

  updateStatus = jest
    .fn<(input: UpdateProductStatusInput) => Promise<ProductRecord | null>>()
    .mockResolvedValue(null);
}

describe("GetActiveCart", () => {
  it("returns the active cart with items and totals", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const cartRepository = new CartRepositoryDouble();
    const productRepository = new ProductRepositoryDouble();
    const getActiveCart = new GetActiveCart(
      authenticationRepository,
      cartRepository,
      productRepository
    );

    const result = await getActiveCart.execute({
      buyerId: "buyer-id"
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("buyer-id");
    expect(cartRepository.findActiveByBuyerId).toHaveBeenCalledWith("buyer-id");
    expect(cartRepository.findItemsByCartId).toHaveBeenCalledWith("cart-id");
    expect(productRepository.findById).toHaveBeenCalledWith("product-id");
    expect(result).toMatchObject({
      cart: {
        id: "cart-id",
        status: "active"
      },
      totalItems: 2,
      subtotal: 170000,
      currency: "NGN"
    });
    expect(result.items[0]).toMatchObject({
      id: "cart-item-id",
      productId: "product-id",
      quantity: 2,
      unitPrice: 85000,
      subtotal: 170000,
      product: {
        name: "Wireless Headset",
        brandName: "Apple",
        availableQuantity: 10
      }
    });
  });

  it("returns an empty state when the buyer has no active cart", async () => {
    const cartRepository = new CartRepositoryDouble();
    cartRepository.findActiveByBuyerId.mockResolvedValue(null);
    const getActiveCart = new GetActiveCart(
      new AuthenticationRepositoryDouble(),
      cartRepository,
      new ProductRepositoryDouble()
    );

    const result = await getActiveCart.execute({
      buyerId: "buyer-id"
    });

    expect(result).toEqual({
      cart: null,
      items: [],
      totalItems: 0,
      subtotal: 0,
      currency: null
    });
    expect(cartRepository.findItemsByCartId).not.toHaveBeenCalled();
  });

  it("throws when the buyer account does not exist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue(null);
    const getActiveCart = new GetActiveCart(
      authenticationRepository,
      new CartRepositoryDouble(),
      new ProductRepositoryDouble()
    );

    await expect(
      getActiveCart.execute({
        buyerId: "missing-buyer-id"
      })
    ).rejects.toBeInstanceOf(GetActiveCartError);
  });

  it("throws when the authenticated user is not a buyer", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      ...makeBuyer(),
      role: "seller"
    });
    const getActiveCart = new GetActiveCart(
      authenticationRepository,
      new CartRepositoryDouble(),
      new ProductRepositoryDouble()
    );

    await expect(
      getActiveCart.execute({
        buyerId: "seller-id"
      })
    ).rejects.toBeInstanceOf(GetActiveCartError);
  });

  it("throws when a cart item product can no longer be loaded", async () => {
    const productRepository = new ProductRepositoryDouble();
    productRepository.findById.mockResolvedValue(null);
    const getActiveCart = new GetActiveCart(
      new AuthenticationRepositoryDouble(),
      new CartRepositoryDouble(),
      productRepository
    );

    await expect(
      getActiveCart.execute({
        buyerId: "buyer-id"
      })
    ).rejects.toBeInstanceOf(GetActiveCartError);
  });
});
