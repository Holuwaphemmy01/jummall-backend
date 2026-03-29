import { describe, expect, it, jest } from "@jest/globals";

import {
  AddProductToWishlist,
  AddProductToWishlistError
} from "../../../src/application/buyer/add-product-to-wishlist";
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

class ProductRepositoryDouble implements ProductRepository {
  create = jest
    .fn<(input: CreateProductInput) => Promise<ProductRecord>>();

  findById = jest
    .fn<(productId: string) => Promise<ProductRecord | null>>()
    .mockResolvedValue({
      id: "product-id",
      sellerId: "seller-id",
      categoryId: "category-id",
      brandId: null,
      brandName: null,
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
      reviewedAt: new Date("2026-03-29T00:00:00.000Z"),
      images: [],
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
    });

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
    .mockImplementation(async (input) => ({
      id: "wishlist-item-id",
      buyerId: input.buyerId,
      productId: input.productId,
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
    }));

  findByBuyerIdAndProductId = jest
    .fn<(buyerId: string, productId: string) => Promise<WishlistItemRecord | null>>()
    .mockResolvedValue(null);

  deleteByBuyerIdAndProductId = jest
    .fn<(buyerId: string, productId: string) => Promise<WishlistItemRecord | null>>()
    .mockResolvedValue(null);
}

describe("AddProductToWishlist", () => {
  it("adds an approved product to buyer wishlist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const productRepository = new ProductRepositoryDouble();
    const wishlistRepository = new WishlistRepositoryDouble();
    const addProductToWishlist = new AddProductToWishlist(
      authenticationRepository,
      productRepository,
      wishlistRepository
    );

    const result = await addProductToWishlist.execute({
      buyerId: "buyer-id",
      productId: "product-id"
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("buyer-id");
    expect(productRepository.findById).toHaveBeenCalledWith("product-id");
    expect(wishlistRepository.findByBuyerIdAndProductId).toHaveBeenCalledWith(
      "buyer-id",
      "product-id"
    );
    expect(wishlistRepository.create).toHaveBeenCalledWith({
      buyerId: "buyer-id",
      productId: "product-id"
    });
    expect(result.id).toBe("wishlist-item-id");
  });

  it("throws when the product is not approved", async () => {
    const productRepository = new ProductRepositoryDouble();
    productRepository.findById.mockResolvedValue({
      ...(awaitableApprovedProduct()),
      status: "pending_review"
    });
    const addProductToWishlist = new AddProductToWishlist(
      new AuthenticationRepositoryDouble(),
      productRepository,
      new WishlistRepositoryDouble()
    );

    await expect(
      addProductToWishlist.execute({
        buyerId: "buyer-id",
        productId: "product-id"
      })
    ).rejects.toBeInstanceOf(AddProductToWishlistError);
  });

  it("throws when the product is already in wishlist", async () => {
    const wishlistRepository = new WishlistRepositoryDouble();
    wishlistRepository.findByBuyerIdAndProductId.mockResolvedValue({
      id: "wishlist-item-id",
      buyerId: "buyer-id",
      productId: "product-id",
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
    });
    const addProductToWishlist = new AddProductToWishlist(
      new AuthenticationRepositoryDouble(),
      new ProductRepositoryDouble(),
      wishlistRepository
    );

    await expect(
      addProductToWishlist.execute({
        buyerId: "buyer-id",
        productId: "product-id"
      })
    ).rejects.toBeInstanceOf(AddProductToWishlistError);
  });
});

function awaitableApprovedProduct(): ProductRecord {
  return {
    id: "product-id",
    sellerId: "seller-id",
    categoryId: "category-id",
    brandId: null,
    brandName: null,
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
    reviewedAt: new Date("2026-03-29T00:00:00.000Z"),
    images: [],
    createdAt: new Date("2026-03-29T00:00:00.000Z"),
    updatedAt: new Date("2026-03-29T00:00:00.000Z")
  };
}
