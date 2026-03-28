import { describe, expect, it, jest } from "@jest/globals";

import {
  ApproveProductPendingReview,
  ApproveProductPendingReviewError
} from "../../../src/application/admin/approve-product-pending-review";
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

describe("ApproveProductPendingReview", () => {
  it("approves a product in pending review", async () => {
    const productRepository = new ProductRepositoryDouble();
    const approveProductPendingReview = new ApproveProductPendingReview(
      productRepository
    );

    const result = await approveProductPendingReview.execute({
      productId: "product-id",
      reviewNote: "Approved for listing."
    });

    expect(productRepository.findById).toHaveBeenCalledWith("product-id");
    expect(productRepository.updateStatus).toHaveBeenCalledWith({
      productId: "product-id",
      status: "approved",
      reviewNote: "Approved for listing.",
      reviewedAt: expect.any(Date)
    });
    expect(result.status).toBe("approved");
  });

  it("throws when the product cannot be approved in its current state", async () => {
    const productRepository = new ProductRepositoryDouble();
    productRepository.findById.mockResolvedValue(
      makeProduct({ status: "approved" })
    );
    const approveProductPendingReview = new ApproveProductPendingReview(
      productRepository
    );

    await expect(
      approveProductPendingReview.execute({ productId: "product-id" })
    ).rejects.toBeInstanceOf(ApproveProductPendingReviewError);
    expect(productRepository.updateStatus).not.toHaveBeenCalled();
  });
});
