import { describe, expect, it, jest } from "@jest/globals";

import {
  ListApprovedProducts,
  ListApprovedProductsError
} from "../../../src/application/product/list-approved-products";
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
    .mockResolvedValue(null);

  searchApprovedSuggestions = jest
    .fn<(input: { query: string; limit: number }) => Promise<ProductRecord[]>>()
    .mockResolvedValue([]);
}

describe("ListApprovedProducts", () => {
  it("returns approved products with default pagination", async () => {
    const productCatalogRepository = new ProductCatalogRepositoryDouble();
    const listApprovedProducts = new ListApprovedProducts(productCatalogRepository);

    const result = await listApprovedProducts.execute({});

    expect(productCatalogRepository.listApproved).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      categoryId: undefined,
      brandId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      search: undefined
    });
    expect(result).toMatchObject({
      total: 0,
      page: 1,
      limit: 20
    });
  });

  it("throws when minimum price is greater than maximum price", async () => {
    const listApprovedProducts = new ListApprovedProducts(
      new ProductCatalogRepositoryDouble()
    );

    await expect(
      listApprovedProducts.execute({
        minPrice: 1000,
        maxPrice: 500
      })
    ).rejects.toBeInstanceOf(ListApprovedProductsError);
  });
});
