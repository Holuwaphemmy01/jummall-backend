import { describe, expect, it, jest } from "@jest/globals";

import {
  GetApprovedProductDetail,
  GetApprovedProductDetailError
} from "../../../src/application/product/get-approved-product-detail";
import type {
  ApprovedProductCatalogPage,
  ListApprovedProductsInput,
  ProductCatalogRepository
} from "../../../src/ports/product-catalog-repository";
import type { ProductRecord } from "../../../src/ports/product-repository";

class ProductCatalogRepositoryDouble implements ProductCatalogRepository {
  listApproved = jest
    .fn<(input: ListApprovedProductsInput) => Promise<ApprovedProductCatalogPage>>()
    .mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20
    });

  findApprovedById = jest
    .fn<(productId: string) => Promise<ProductRecord | null>>()
    .mockResolvedValue({
      id: "product-id",
      sellerId: "seller-id",
      categoryId: "category-id",
      brandId: "brand-id",
      brandName: "Apple",
      name: "Wireless Headset",
      description: "Noise-cancelling wireless headset",
      sku: "HEADSET-001",
      price: 85000,
      quantity: 0,
      currency: "NGN",
      condition: "new",
      weightKg: 0.4,
      status: "approved",
      reviewNote: "Approved for listing.",
      reviewedAt: new Date("2026-03-29T00:00:00.000Z"),
      images: [
        {
          id: "image-id",
          productId: "product-id",
          storagePath: "products/seller-id/product-id/front.jpg",
          mimeType: "image/jpeg",
          originalFileName: "front.jpg",
          position: 0,
          createdAt: new Date("2026-03-29T00:00:00.000Z"),
          updatedAt: new Date("2026-03-29T00:00:00.000Z")
        }
      ],
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
    });

  searchApprovedSuggestions = jest
    .fn<(input: { query: string; limit: number }) => Promise<ProductRecord[]>>()
    .mockResolvedValue([]);
}

describe("GetApprovedProductDetail", () => {
  it("returns an approved product detail", async () => {
    const productCatalogRepository = new ProductCatalogRepositoryDouble();
    const getApprovedProductDetail = new GetApprovedProductDetail(
      productCatalogRepository
    );

    const result = await getApprovedProductDetail.execute({
      productId: "product-id"
    });

    expect(productCatalogRepository.findApprovedById).toHaveBeenCalledWith(
      "product-id"
    );
    expect(result).toMatchObject({
      id: "product-id",
      status: "approved",
      quantity: 0
    });
  });

  it("trims the incoming product id before lookup", async () => {
    const productCatalogRepository = new ProductCatalogRepositoryDouble();
    const getApprovedProductDetail = new GetApprovedProductDetail(
      productCatalogRepository
    );

    await getApprovedProductDetail.execute({
      productId: "  product-id  "
    });

    expect(productCatalogRepository.findApprovedById).toHaveBeenCalledWith(
      "product-id"
    );
  });

  it("throws when the product id is empty", async () => {
    const getApprovedProductDetail = new GetApprovedProductDetail(
      new ProductCatalogRepositoryDouble()
    );

    await expect(
      getApprovedProductDetail.execute({
        productId: "   "
      })
    ).rejects.toMatchObject({
      name: "GetApprovedProductDetailError",
      message: "Product id is required.",
      statusCode: 400,
      field: "productId"
    });
  });

  it("throws when the product does not exist or is not approved", async () => {
    const productCatalogRepository = new ProductCatalogRepositoryDouble();
    const getApprovedProductDetail = new GetApprovedProductDetail(
      productCatalogRepository
    );

    productCatalogRepository.findApprovedById.mockResolvedValue(null);

    await expect(
      getApprovedProductDetail.execute({
        productId: "missing-product-id"
      })
    ).rejects.toBeInstanceOf(GetApprovedProductDetailError);
  });

  it("propagates repository failures", async () => {
    const productCatalogRepository = new ProductCatalogRepositoryDouble();
    const getApprovedProductDetail = new GetApprovedProductDetail(
      productCatalogRepository
    );
    const repositoryError = new Error("lookup failed");

    productCatalogRepository.findApprovedById.mockRejectedValue(repositoryError);

    await expect(
      getApprovedProductDetail.execute({
        productId: "product-id"
      })
    ).rejects.toThrow(repositoryError);
  });
});
