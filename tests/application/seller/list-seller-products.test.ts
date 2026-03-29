import { describe, expect, it, jest } from "@jest/globals";

import {
  ListSellerProducts,
  ListSellerProductsError
} from "../../../src/application/seller/list-seller-products";
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

function makeProduct(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: "product-id",
    sellerId: "seller-id",
    categoryId: "category-id",
    brandId: "brand-id",
    brandName: "Apple",
    name: "iPhone 13",
    description: "Clean iPhone 13 with 128GB storage",
    sku: "IPH13-128",
    price: 850000,
    quantity: 4,
    currency: "NGN",
    condition: "new",
    weightKg: 0.24,
    status: "pending_review",
    reviewNote: null,
    reviewedAt: null,
    images: [],
    createdAt: new Date("2026-03-29T00:00:00.000Z"),
    updatedAt: new Date("2026-03-29T00:00:00.000Z"),
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
      id: "seller-id",
      firstName: "Jane",
      lastName: "Doe",
      username: "jane.doe",
      email: "jane@example.com",
      phone: "+2348012345678",
      passwordHash: "hashed-password",
      role: "seller",
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
    .fn<(input: CreateProductInput) => Promise<ProductRecord>>()
    .mockResolvedValue(makeProduct());

  findById = jest
    .fn<(productId: string) => Promise<ProductRecord | null>>()
    .mockResolvedValue(null);

  findBySellerId = jest
    .fn<(sellerId: string) => Promise<ProductRecord[]>>()
    .mockResolvedValue([
      makeProduct(),
      makeProduct({
        id: "product-id-2",
        name: "Wireless Headset"
      })
    ]);

  findPendingReview = jest
    .fn<() => Promise<ProductRecord[]>>()
    .mockResolvedValue([]);

  updateStatus = jest
    .fn<(input: UpdateProductStatusInput) => Promise<ProductRecord | null>>()
    .mockResolvedValue(null);
}

describe("ListSellerProducts", () => {
  it("returns all products created by the seller", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const productRepository = new ProductRepositoryDouble();
    const listSellerProducts = new ListSellerProducts(
      authenticationRepository,
      productRepository
    );

    const result = await listSellerProducts.execute({
      sellerId: "seller-id"
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("seller-id");
    expect(productRepository.findBySellerId).toHaveBeenCalledWith("seller-id");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "product-id",
      sellerId: "seller-id"
    });
  });

  it("throws when the authenticated user is not a seller", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      ...(awaitableSeller()),
      role: "buyer"
    });
    const listSellerProducts = new ListSellerProducts(
      authenticationRepository,
      new ProductRepositoryDouble()
    );

    await expect(
      listSellerProducts.execute({
        sellerId: "seller-id"
      })
    ).rejects.toBeInstanceOf(ListSellerProductsError);
  });
});

function awaitableSeller(): AuthUser {
  return {
    id: "seller-id",
    firstName: "Jane",
    lastName: "Doe",
    username: "jane.doe",
    email: "jane@example.com",
    phone: "+2348012345678",
    passwordHash: "hashed-password",
    role: "seller",
    accountStatus: "verified",
    createdAt: new Date("2026-03-29T00:00:00.000Z"),
    updatedAt: new Date("2026-03-29T00:00:00.000Z")
  };
}
