import { describe, expect, it, jest } from "@jest/globals";

import {
  ClearBuyerCart,
  ClearBuyerCartError
} from "../../../src/application/buyer/clear-buyer-cart";
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

  clearItemsByCartId = jest
    .fn<(cartId: string) => Promise<number>>()
    .mockResolvedValue(1);

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

describe("ClearBuyerCart", () => {
  it("clears all items in the buyer active cart", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const cartRepository = new CartRepositoryDouble();
    const clearBuyerCart = new ClearBuyerCart(
      authenticationRepository,
      cartRepository
    );

    const result = await clearBuyerCart.execute({
      buyerId: "buyer-id"
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("buyer-id");
    expect(cartRepository.findActiveByBuyerId).toHaveBeenCalledWith("buyer-id");
    expect(cartRepository.clearItemsByCartId).toHaveBeenCalledWith("cart-id");
    expect(result).toEqual({
      cartId: "cart-id",
      cartStatus: "active",
      clearedItemsCount: 1
    });
  });

  it("returns a zero-clear result when the buyer has no active cart", async () => {
    const cartRepository = new CartRepositoryDouble();
    cartRepository.findActiveByBuyerId.mockResolvedValue(null);
    const clearBuyerCart = new ClearBuyerCart(
      new AuthenticationRepositoryDouble(),
      cartRepository
    );

    const result = await clearBuyerCart.execute({
      buyerId: "buyer-id"
    });

    expect(cartRepository.clearItemsByCartId).not.toHaveBeenCalled();
    expect(result).toEqual({
      cartId: null,
      cartStatus: null,
      clearedItemsCount: 0
    });
  });

  it("returns success when the active cart is already empty", async () => {
    const cartRepository = new CartRepositoryDouble();
    cartRepository.clearItemsByCartId.mockResolvedValue(0);
    const clearBuyerCart = new ClearBuyerCart(
      new AuthenticationRepositoryDouble(),
      cartRepository
    );

    const result = await clearBuyerCart.execute({
      buyerId: "buyer-id"
    });

    expect(result).toEqual({
      cartId: "cart-id",
      cartStatus: "active",
      clearedItemsCount: 0
    });
  });

  it("throws when the buyer account does not exist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue(null);
    const clearBuyerCart = new ClearBuyerCart(
      authenticationRepository,
      new CartRepositoryDouble()
    );

    await expect(
      clearBuyerCart.execute({
        buyerId: "missing-buyer-id"
      })
    ).rejects.toBeInstanceOf(ClearBuyerCartError);
  });

  it("throws when the authenticated user is not a buyer", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      ...makeBuyer(),
      role: "seller"
    });
    const clearBuyerCart = new ClearBuyerCart(
      authenticationRepository,
      new CartRepositoryDouble()
    );

    await expect(
      clearBuyerCart.execute({
        buyerId: "seller-id"
      })
    ).rejects.toBeInstanceOf(ClearBuyerCartError);
  });
});
