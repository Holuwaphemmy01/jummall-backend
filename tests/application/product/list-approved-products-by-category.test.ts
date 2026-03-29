import { describe, expect, it, jest } from "@jest/globals";

import {
  ListApprovedProductsByCategory,
  ListApprovedProductsByCategoryError
} from "../../../src/application/product/list-approved-products-by-category";
import type {
  ApprovedProductCatalogPage,
  ListApprovedProductsInput,
  ProductCatalogRepository
} from "../../../src/ports/product-catalog-repository";
import type {
  CreateProductCategoryInput,
  ProductCategoryRecord,
  ProductCategoryRepository,
  UpdateProductCategoryInput
} from "../../../src/ports/product-category-repository";

class ProductCatalogRepositoryDouble implements ProductCatalogRepository {
  listApproved = jest
    .fn<(input: ListApprovedProductsInput) => Promise<ApprovedProductCatalogPage>>()
    .mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20
    });
}

class ProductCategoryRepositoryDouble implements ProductCategoryRepository {
  create = jest
    .fn<(input: CreateProductCategoryInput) => Promise<ProductCategoryRecord>>();

  findAll = jest.fn<() => Promise<ProductCategoryRecord[]>>().mockResolvedValue([]);

  findById = jest
    .fn<(categoryId: string) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue({
      id: "category-id",
      name: "Electronics",
      description: "Phones and gadgets",
      deductionPercentage: 12.5,
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
    });

  findByName = jest
    .fn<(name: string) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(null);

  update = jest
    .fn<(input: UpdateProductCategoryInput) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(null);
}

describe("ListApprovedProductsByCategory", () => {
  it("returns approved products for a valid category", async () => {
    const productCategoryRepository = new ProductCategoryRepositoryDouble();
    const productCatalogRepository = new ProductCatalogRepositoryDouble();
    const listApprovedProductsByCategory = new ListApprovedProductsByCategory(
      productCategoryRepository,
      productCatalogRepository
    );

    const result = await listApprovedProductsByCategory.execute({
      categoryId: "category-id",
      page: 1,
      limit: 20
    });

    expect(productCategoryRepository.findById).toHaveBeenCalledWith("category-id");
    expect(productCatalogRepository.listApproved).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      categoryId: "category-id",
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

  it("throws when the category does not exist", async () => {
    const productCategoryRepository = new ProductCategoryRepositoryDouble();
    productCategoryRepository.findById.mockResolvedValue(null);
    const listApprovedProductsByCategory = new ListApprovedProductsByCategory(
      productCategoryRepository,
      new ProductCatalogRepositoryDouble()
    );

    await expect(
      listApprovedProductsByCategory.execute({
        categoryId: "missing-category-id"
      })
    ).rejects.toBeInstanceOf(ListApprovedProductsByCategoryError);
  });
});
