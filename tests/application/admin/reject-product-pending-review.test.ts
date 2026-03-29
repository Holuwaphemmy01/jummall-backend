import { describe, expect, it, jest } from "@jest/globals";

import {
  RejectProductPendingReview,
  RejectProductPendingReviewError
} from "../../../src/application/admin/reject-product-pending-review";
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
    name: "Wireless Headset",
    description: "Noise-cancelling wireless headset",
    sku: "HEADSET-001",
    price: 85000,
    quantity: 10,
    currency: "NGN",
    condition: "new",
    brand: "Jummall Audio",
    weightKg: 0.4,
    status: "pending_review",
    reviewNote: null,
    reviewedAt: null,
    images: [],
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
    .mockImplementation(async (input) =>
      makeProduct({
        status: input.status,
        reviewNote: input.reviewNote ?? null,
        reviewedAt: input.reviewedAt ?? null
      })
    );
}

describe("RejectProductPendingReview", () => {
  it("rejects a product in pending review", async () => {
    const productRepository = new ProductRepositoryDouble();
    const rejectProductPendingReview = new RejectProductPendingReview(
      productRepository
    );

    const result = await rejectProductPendingReview.execute({
      productId: "product-id",
      reviewNote: "Product images are too blurry."
    });

    expect(productRepository.findById).toHaveBeenCalledWith("product-id");
    expect(productRepository.updateStatus).toHaveBeenCalledWith({
      productId: "product-id",
      status: "rejected",
      reviewNote: "Product images are too blurry.",
      reviewedAt: expect.any(Date)
    });
    expect(result.status).toBe("rejected");
  });

  it("throws when the product cannot be rejected in its current state", async () => {
    const productRepository = new ProductRepositoryDouble();
    productRepository.findById.mockResolvedValue(
      makeProduct({ status: "approved" })
    );
    const rejectProductPendingReview = new RejectProductPendingReview(
      productRepository
    );

    await expect(
      rejectProductPendingReview.execute({
        productId: "product-id",
        reviewNote: "Product does not meet listing requirements."
      })
    ).rejects.toBeInstanceOf(RejectProductPendingReviewError);
    expect(productRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("throws when the rejection note is empty", async () => {
    const productRepository = new ProductRepositoryDouble();
    const rejectProductPendingReview = new RejectProductPendingReview(
      productRepository
    );

    await expect(
      rejectProductPendingReview.execute({
        productId: "product-id",
        reviewNote: "   "
      })
    ).rejects.toBeInstanceOf(RejectProductPendingReviewError);
    expect(productRepository.updateStatus).not.toHaveBeenCalled();
  });
});
