import { describe, expect, it, jest } from "@jest/globals";

import {
  RemoveProductFromWishlist,
  RemoveProductFromWishlistError
} from "../../../src/application/buyer/remove-product-from-wishlist";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  CreateWishlistItemInput,
  WishlistItemRecord,
  WishlistRepository
} from "../../../src/ports/wishlist-repository";

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
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
    });

  updatePassword = jest
    .fn<(input: { userId: string; passwordHash: string }) => Promise<void>>()
    .mockResolvedValue();
}

class WishlistRepositoryDouble implements WishlistRepository {
  create = jest
    .fn<(input: CreateWishlistItemInput) => Promise<WishlistItemRecord>>();

  findByBuyerIdAndProductId = jest
    .fn<(buyerId: string, productId: string) => Promise<WishlistItemRecord | null>>()
    .mockResolvedValue({
      id: "wishlist-item-id",
      buyerId: "buyer-id",
      productId: "product-id",
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
    });

  deleteByBuyerIdAndProductId = jest
    .fn<(buyerId: string, productId: string) => Promise<WishlistItemRecord | null>>()
    .mockResolvedValue({
      id: "wishlist-item-id",
      buyerId: "buyer-id",
      productId: "product-id",
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
    });
}

describe("RemoveProductFromWishlist", () => {
  it("removes a product from buyer wishlist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const wishlistRepository = new WishlistRepositoryDouble();
    const removeProductFromWishlist = new RemoveProductFromWishlist(
      authenticationRepository,
      wishlistRepository
    );

    await removeProductFromWishlist.execute({
      buyerId: "buyer-id",
      productId: "product-id"
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("buyer-id");
    expect(wishlistRepository.findByBuyerIdAndProductId).toHaveBeenCalledWith(
      "buyer-id",
      "product-id"
    );
    expect(wishlistRepository.deleteByBuyerIdAndProductId).toHaveBeenCalledWith(
      "buyer-id",
      "product-id"
    );
  });

  it("throws when the wishlist item does not exist", async () => {
    const wishlistRepository = new WishlistRepositoryDouble();
    wishlistRepository.findByBuyerIdAndProductId.mockResolvedValue(null);
    const removeProductFromWishlist = new RemoveProductFromWishlist(
      new AuthenticationRepositoryDouble(),
      wishlistRepository
    );

    await expect(
      removeProductFromWishlist.execute({
        buyerId: "buyer-id",
        productId: "missing-product-id"
      })
    ).rejects.toBeInstanceOf(RemoveProductFromWishlistError);
    expect(wishlistRepository.deleteByBuyerIdAndProductId).not.toHaveBeenCalled();
  });
});
