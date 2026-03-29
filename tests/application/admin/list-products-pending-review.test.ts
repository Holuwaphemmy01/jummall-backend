import { describe, expect, it, jest } from "@jest/globals";

import { ListProductsPendingReview } from "../../../src/application/admin/list-products-pending-review";
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
    .mockResolvedValue(null);

  findBySellerId = jest
    .fn<(sellerId: string) => Promise<ProductRecord[]>>()
    .mockResolvedValue([]);

  findPendingReview = jest
    .fn<() => Promise<ProductRecord[]>>()
    .mockResolvedValue([
      makeProduct(),
      makeProduct({
        id: "product-id-2",
        name: "Bluetooth Speaker"
      })
    ]);

  updateStatus = jest
    .fn<(input: UpdateProductStatusInput) => Promise<ProductRecord | null>>()
    .mockResolvedValue(null);
}

describe("ListProductsPendingReview", () => {
  it("returns products pending review", async () => {
    const productRepository = new ProductRepositoryDouble();
    const listProductsPendingReview = new ListProductsPendingReview(
      productRepository
    );

    const result = await listProductsPendingReview.execute();

    expect(productRepository.findPendingReview).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "product-id",
      status: "pending_review"
    });
  });
});
