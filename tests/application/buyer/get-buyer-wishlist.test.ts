import { describe, expect, it, jest } from "@jest/globals";

import {
  GetBuyerWishlist,
  GetBuyerWishlistError
} from "../../../src/application/buyer/get-buyer-wishlist";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  CreateProductInput,
  ProductRecord,
  ProductRepository,
  UpdateProductStatusInput
} from "../../../src/ports/product-repository";
import type {
  CreateWishlistItemInput,
  WishlistItemRecord,
  WishlistRepository
} from "../../../src/ports/wishlist-repository";

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

function makeWishlistItem(
  overrides: Partial<WishlistItemRecord> = {}
): WishlistItemRecord {
  return {
    id: "wishlist-item-id",
    buyerId: "buyer-id",
    productId: "product-id",
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

class ProductRepositoryDouble implements ProductRepository {
  create = jest
    .fn<(input: CreateProductInput) => Promise<ProductRecord>>();

  findById = jest
    .fn<(productId: string) => Promise<ProductRecord | null>>()
    .mockResolvedValue(makeProduct());

  findBySellerId = jest
    .fn<(sellerId: string) => Promise<ProductRecord[]>>()
    .mockResolvedValue([]);

  findPendingReview = jest
    .fn<() => Promise<ProductRecord[]>>()
    .mockResolvedValue([]);

  updateStatus = jest
    .fn<(input: UpdateProductStatusInput) => Promise<ProductRecord | null>>()
    .mockResolvedValue(null);
}

class WishlistRepositoryDouble implements WishlistRepository {
  create = jest
    .fn<(input: CreateWishlistItemInput) => Promise<WishlistItemRecord>>()
    .mockResolvedValue(makeWishlistItem());

  findByBuyerId = jest
    .fn<(buyerId: string) => Promise<WishlistItemRecord[]>>()
    .mockResolvedValue([makeWishlistItem()]);

  findByBuyerIdAndProductId = jest
    .fn<(buyerId: string, productId: string) => Promise<WishlistItemRecord | null>>()
    .mockResolvedValue(makeWishlistItem());

  deleteByBuyerIdAndProductId = jest
    .fn<(buyerId: string, productId: string) => Promise<WishlistItemRecord | null>>()
    .mockResolvedValue(makeWishlistItem());
}

describe("GetBuyerWishlist", () => {
  it("returns the buyer wishlist with product details", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const wishlistRepository = new WishlistRepositoryDouble();
    const productRepository = new ProductRepositoryDouble();
    const getBuyerWishlist = new GetBuyerWishlist(
      authenticationRepository,
      wishlistRepository,
      productRepository
    );

    const result = await getBuyerWishlist.execute({
      buyerId: "buyer-id"
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("buyer-id");
    expect(wishlistRepository.findByBuyerId).toHaveBeenCalledWith("buyer-id");
    expect(productRepository.findById).toHaveBeenCalledWith("product-id");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "wishlist-item-id",
      buyerId: "buyer-id",
      productId: "product-id",
      product: {
        name: "Wireless Headset",
        brandName: "Apple",
        price: 85000,
        currency: "NGN"
      }
    });
  });

  it("returns an empty wishlist when the buyer has no wishlist items", async () => {
    const wishlistRepository = new WishlistRepositoryDouble();
    wishlistRepository.findByBuyerId.mockResolvedValue([]);
    const getBuyerWishlist = new GetBuyerWishlist(
      new AuthenticationRepositoryDouble(),
      wishlistRepository,
      new ProductRepositoryDouble()
    );

    const result = await getBuyerWishlist.execute({
      buyerId: "buyer-id"
    });

    expect(result).toEqual({
      items: []
    });
  });

  it("skips wishlist entries whose products no longer exist", async () => {
    const wishlistRepository = new WishlistRepositoryDouble();
    wishlistRepository.findByBuyerId.mockResolvedValue([
      makeWishlistItem({ productId: "missing-product-id" })
    ]);
    const productRepository = new ProductRepositoryDouble();
    productRepository.findById.mockResolvedValue(null);
    const getBuyerWishlist = new GetBuyerWishlist(
      new AuthenticationRepositoryDouble(),
      wishlistRepository,
      productRepository
    );

    const result = await getBuyerWishlist.execute({
      buyerId: "buyer-id"
    });

    expect(result).toEqual({
      items: []
    });
  });

  it("throws when the buyer account does not exist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue(null);
    const getBuyerWishlist = new GetBuyerWishlist(
      authenticationRepository,
      new WishlistRepositoryDouble(),
      new ProductRepositoryDouble()
    );

    await expect(
      getBuyerWishlist.execute({
        buyerId: "missing-buyer-id"
      })
    ).rejects.toBeInstanceOf(GetBuyerWishlistError);
  });

  it("throws when the authenticated user is not a buyer", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      ...makeBuyer(),
      role: "seller"
    });
    const getBuyerWishlist = new GetBuyerWishlist(
      authenticationRepository,
      new WishlistRepositoryDouble(),
      new ProductRepositoryDouble()
    );

    await expect(
      getBuyerWishlist.execute({
        buyerId: "seller-id"
      })
    ).rejects.toBeInstanceOf(GetBuyerWishlistError);
  });
});
