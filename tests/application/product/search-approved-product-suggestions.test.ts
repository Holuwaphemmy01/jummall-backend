import { describe, expect, it, jest } from "@jest/globals";

import {
  SearchApprovedProductSuggestions,
  SearchApprovedProductSuggestionsError
} from "../../../src/application/product/search-approved-product-suggestions";
import type {
  ApprovedProductCatalogPage,
  ListApprovedProductsInput,
  ProductCatalogRepository
} from "../../../src/ports/product-catalog-repository";
import type { ProductRecord } from "../../../src/ports/product-repository";

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
    status: "approved",
    reviewNote: null,
    reviewedAt: new Date("2026-03-29T00:00:00.000Z"),
    images: [],
    createdAt: new Date("2026-03-29T00:00:00.000Z"),
    updatedAt: new Date("2026-03-29T00:00:00.000Z"),
    ...overrides
  };
}

class ProductCatalogRepositoryDouble implements ProductCatalogRepository {
  listApproved = jest
    .fn<(input: ListApprovedProductsInput) => Promise<ApprovedProductCatalogPage>>()
    .mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20
    });

  searchApprovedSuggestions = jest
    .fn<(input: { query: string; limit: number }) => Promise<ProductRecord[]>>()
    .mockResolvedValue([
      makeProduct(),
      makeProduct({
        id: "product-id-2",
        name: "iPhone Charger"
      })
    ]);
}

describe("SearchApprovedProductSuggestions", () => {
  it("returns lightweight product suggestions for a typed query", async () => {
    const productCatalogRepository = new ProductCatalogRepositoryDouble();
    const searchApprovedProductSuggestions =
      new SearchApprovedProductSuggestions(productCatalogRepository);

    const result = await searchApprovedProductSuggestions.execute({
      query: "iph"
    });

    expect(productCatalogRepository.searchApprovedSuggestions).toHaveBeenCalledWith({
      query: "iph",
      limit: 10
    });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("iPhone 13");
  });

  it("throws when the query is empty", async () => {
    const searchApprovedProductSuggestions =
      new SearchApprovedProductSuggestions(new ProductCatalogRepositoryDouble());

    await expect(
      searchApprovedProductSuggestions.execute({
        query: "   "
      })
    ).rejects.toBeInstanceOf(SearchApprovedProductSuggestionsError);
  });
});
