import { describe, expect, it, jest } from "@jest/globals";

import {
  ListApprovedProductsByBrandId,
  ListApprovedProductsByBrandIdError
} from "../../../src/application/product/list-approved-products-by-brand-id";
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

  findApprovedById = jest
    .fn<(productId: string) => Promise<ProductRecord | null>>()
    .mockResolvedValue(null);

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
    .mockResolvedValue({
      id: "brand-id",
      name: "Apple",
      description: "Consumer electronics brand",
      image: null,
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
    });

  findByName = jest
    .fn<(name: string) => Promise<ProductBrandRecord | null>>()
    .mockResolvedValue(null);

  update = jest
    .fn<(input: UpdateProductBrandInput) => Promise<ProductBrandRecord | null>>()
    .mockResolvedValue(null);
}

describe("ListApprovedProductsByBrandId", () => {
  it("returns approved products for a valid brand id", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    const productCatalogRepository = new ProductCatalogRepositoryDouble();
    const listApprovedProductsByBrandId = new ListApprovedProductsByBrandId(
      productBrandRepository,
      productCatalogRepository
    );

    const result = await listApprovedProductsByBrandId.execute({
      brandId: "brand-id",
      page: 1,
      limit: 20
    });

    expect(productBrandRepository.findById).toHaveBeenCalledWith("brand-id");
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

  it("throws when the brand id does not exist", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    productBrandRepository.findById.mockResolvedValue(null);
    const listApprovedProductsByBrandId = new ListApprovedProductsByBrandId(
      productBrandRepository,
      new ProductCatalogRepositoryDouble()
    );

    await expect(
      listApprovedProductsByBrandId.execute({
        brandId: "missing-brand-id"
      })
    ).rejects.toBeInstanceOf(ListApprovedProductsByBrandIdError);
  });
});
