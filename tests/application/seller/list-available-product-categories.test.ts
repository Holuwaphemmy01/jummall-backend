import { describe, expect, it, jest } from "@jest/globals";

import { ListAvailableProductCategories } from "../../../src/application/seller/list-available-product-categories";
import type {
  CreateProductCategoryInput,
  ProductCategoryRecord,
  ProductCategoryRepository,
  UpdateProductCategoryInput
} from "../../../src/ports/product-category-repository";

class ProductCategoryRepositoryDouble implements ProductCategoryRepository {
  create = jest
    .fn<(input: CreateProductCategoryInput) => Promise<ProductCategoryRecord>>();

  findAll = jest.fn<() => Promise<ProductCategoryRecord[]>>().mockResolvedValue([
    {
      id: "category-id",
      name: "Electronics",
      description: "Phones, gadgets, and accessories",
      deductionPercentage: 12.5,
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
    }
  ]);

  findById = jest
    .fn<(categoryId: string) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(null);

  findByName = jest
    .fn<(name: string) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(null);

  update = jest
    .fn<
      (input: UpdateProductCategoryInput) => Promise<ProductCategoryRecord | null>
    >()
    .mockResolvedValue(null);
}

describe("ListAvailableProductCategories", () => {
  it("returns all available product categories for sellers", async () => {
    const productCategoryRepository = new ProductCategoryRepositoryDouble();
    const listAvailableProductCategories = new ListAvailableProductCategories(
      productCategoryRepository
    );

    const result = await listAvailableProductCategories.execute();

    expect(productCategoryRepository.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "category-id",
      name: "Electronics",
      deductionPercentage: 12.5
    });
  });
});
