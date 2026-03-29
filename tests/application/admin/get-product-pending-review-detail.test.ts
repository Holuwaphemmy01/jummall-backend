import { describe, expect, it, jest } from "@jest/globals";

import {
  GetProductPendingReviewDetail,
  GetProductPendingReviewDetailError
} from "../../../src/application/admin/get-product-pending-review-detail";
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
    brandName: "Jummall Audio",
    name: "Wireless Headset",
    description: "Noise-cancelling wireless headset",
    sku: "HEADSET-001",
    price: 85000,
    quantity: 10,
    currency: "NGN",
    condition: "new",
    weightKg: 0.4,
    status: "pending_review",
    reviewNote: null,
    reviewedAt: null,
    images: [
      {
        id: "image-id",
        productId: "product-id",
        storagePath: "products/seller-id/image.jpg",
        mimeType: "image/jpeg",
        originalFileName: "image.jpg",
        position: 1,
        createdAt: new Date("2026-03-28T09:00:00.000Z"),
        updatedAt: new Date("2026-03-28T09:00:00.000Z")
      }
    ],
    createdAt: new Date("2026-03-28T09:00:00.000Z"),
    updatedAt: new Date("2026-03-28T09:00:00.000Z"),
    ...overrides
  };
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

  findPendingReview = jest
    .fn<() => Promise<ProductRecord[]>>()
    .mockResolvedValue([]);

  updateStatus = jest
    .fn<(input: UpdateProductStatusInput) => Promise<ProductRecord | null>>()
    .mockResolvedValue(null);
}

describe("GetProductPendingReviewDetail", () => {
  it("returns a pending-review product detail", async () => {
    const productRepository = new ProductRepositoryDouble();
    const getProductPendingReviewDetail = new GetProductPendingReviewDetail(
      productRepository
    );

    const result = await getProductPendingReviewDetail.execute({
      productId: "product-id"
    });

    expect(productRepository.findById).toHaveBeenCalledWith("product-id");
    expect(result).toMatchObject({
      id: "product-id",
      status: "pending_review"
    });
  });

  it("throws when the product does not exist", async () => {
    const productRepository = new ProductRepositoryDouble();
    productRepository.findById.mockResolvedValue(null);
    const getProductPendingReviewDetail = new GetProductPendingReviewDetail(
      productRepository
    );

    await expect(
      getProductPendingReviewDetail.execute({
        productId: "missing-product-id"
      })
    ).rejects.toBeInstanceOf(GetProductPendingReviewDetailError);
  });

  it("throws when the product is no longer pending review", async () => {
    const productRepository = new ProductRepositoryDouble();
    productRepository.findById.mockResolvedValue(
      makeProduct({ status: "approved" })
    );
    const getProductPendingReviewDetail = new GetProductPendingReviewDetail(
      productRepository
    );

    await expect(
      getProductPendingReviewDetail.execute({
        productId: "product-id"
      })
    ).rejects.toBeInstanceOf(GetProductPendingReviewDetailError);
  });
});
