import { describe, expect, it, jest } from "@jest/globals";

import {
  ListApprovedProductsByBrandName,
  ListApprovedProductsByBrandNameError
} from "../../../src/application/product/list-approved-products-by-brand-name";
import type {
  ApprovedProductCatalogPage,
  ListApprovedProductsInput,
  ProductCatalogRepository
} from "../../../src/ports/product-catalog-repository";
import type {
  CreateProductBrandInput,
  ProductBrandRecord,
  ProductBrandRepository,
  UpdateProductBrandInput
} from "../../../src/ports/product-brand-repository";
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

  searchApprovedSuggestions = jest
    .fn<(input: { query: string; limit: number }) => Promise<ProductRecord[]>>()
    .mockResolvedValue([]);
}

class ProductBrandRepositoryDouble implements ProductBrandRepository {
  create = jest
    .fn<(input: CreateProductBrandInput) => Promise<ProductBrandRecord>>();

  findAll = jest.fn<() => Promise<ProductBrandRecord[]>>().mockResolvedValue([]);

  findById = jest
    .fn<(brandId: string) => Promise<ProductBrandRecord | null>>()
    .mockResolvedValue(null);

  findByName = jest
    .fn<(name: string) => Promise<ProductBrandRecord | null>>()
    .mockResolvedValue({
      id: "brand-id",
      name: "Apple",
      description: "Consumer electronics brand",
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
    });

  update = jest
    .fn<(input: UpdateProductBrandInput) => Promise<ProductBrandRecord | null>>()
    .mockResolvedValue(null);
}

describe("ListApprovedProductsByBrandName", () => {
  it("returns approved products for a valid brand name", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    const productCatalogRepository = new ProductCatalogRepositoryDouble();
    const listApprovedProductsByBrandName = new ListApprovedProductsByBrandName(
      productBrandRepository,
      productCatalogRepository
    );

    const result = await listApprovedProductsByBrandName.execute({
      brandName: "Apple",
      page: 1,
      limit: 20
    });

    expect(productBrandRepository.findByName).toHaveBeenCalledWith("Apple");
    expect(productCatalogRepository.listApproved).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      brandId: "brand-id"
    });
    expect(result).toMatchObject({
      total: 0,
      page: 1,
      limit: 20
    });
  });

  it("throws when the brand name does not exist", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    productBrandRepository.findByName.mockResolvedValue(null);
    const listApprovedProductsByBrandName = new ListApprovedProductsByBrandName(
      productBrandRepository,
      new ProductCatalogRepositoryDouble()
    );

    await expect(
      listApprovedProductsByBrandName.execute({
        brandName: "Unknown Brand"
      })
    ).rejects.toBeInstanceOf(ListApprovedProductsByBrandNameError);
  });
});
