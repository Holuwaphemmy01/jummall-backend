import { describe, expect, it, jest } from "@jest/globals";

import {
  RemoveProductFromCart,
  RemoveProductFromCartError
} from "../../../src/application/buyer/remove-product-from-cart";
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
    .mockResolvedValue({
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
    });

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

describe("RemoveProductFromCart", () => {
  it("removes a product from the buyer active cart", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const cartRepository = new CartRepositoryDouble();
    const removeProductFromCart = new RemoveProductFromCart(
      authenticationRepository,
      cartRepository
    );

    const result = await removeProductFromCart.execute({
      buyerId: "buyer-id",
      productId: "product-id"
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("buyer-id");
    expect(cartRepository.findActiveByBuyerId).toHaveBeenCalledWith("buyer-id");
    expect(cartRepository.findItemByCartIdAndProductId).toHaveBeenCalledWith(
      "cart-id",
      "product-id"
    );
    expect(cartRepository.deleteCartItem).toHaveBeenCalledWith("cart-item-id");
    expect(result.id).toBe("cart-item-id");
  });

  it("throws when the buyer account does not exist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue(null);
    const removeProductFromCart = new RemoveProductFromCart(
      authenticationRepository,
      new CartRepositoryDouble()
    );

    await expect(
      removeProductFromCart.execute({
        buyerId: "missing-buyer-id",
        productId: "product-id"
      })
    ).rejects.toBeInstanceOf(RemoveProductFromCartError);
  });

  it("throws when the authenticated user is not a buyer", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      ...(awaitableBuyer()),
      role: "seller"
    });
    const removeProductFromCart = new RemoveProductFromCart(
      authenticationRepository,
      new CartRepositoryDouble()
    );

    await expect(
      removeProductFromCart.execute({
        buyerId: "seller-id",
        productId: "product-id"
      })
    ).rejects.toBeInstanceOf(RemoveProductFromCartError);
  });

  it("throws when the buyer has no active cart", async () => {
    const cartRepository = new CartRepositoryDouble();
    cartRepository.findActiveByBuyerId.mockResolvedValue(null);
    const removeProductFromCart = new RemoveProductFromCart(
      new AuthenticationRepositoryDouble(),
      cartRepository
    );

    await expect(
      removeProductFromCart.execute({
        buyerId: "buyer-id",
        productId: "product-id"
      })
    ).rejects.toBeInstanceOf(RemoveProductFromCartError);
  });

  it("throws when the product is not in the active cart", async () => {
    const cartRepository = new CartRepositoryDouble();
    cartRepository.findItemByCartIdAndProductId.mockResolvedValue(null);
    const removeProductFromCart = new RemoveProductFromCart(
      new AuthenticationRepositoryDouble(),
      cartRepository
    );

    await expect(
      removeProductFromCart.execute({
        buyerId: "buyer-id",
        productId: "missing-product-id"
      })
    ).rejects.toBeInstanceOf(RemoveProductFromCartError);
  });

  it("throws when the cart item delete unexpectedly fails", async () => {
    const cartRepository = new CartRepositoryDouble();
    cartRepository.deleteCartItem.mockResolvedValue(null);
    const removeProductFromCart = new RemoveProductFromCart(
      new AuthenticationRepositoryDouble(),
      cartRepository
    );

    await expect(
      removeProductFromCart.execute({
        buyerId: "buyer-id",
        productId: "product-id"
      })
    ).rejects.toBeInstanceOf(RemoveProductFromCartError);
  });
});

function awaitableBuyer(): AuthUser {
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
