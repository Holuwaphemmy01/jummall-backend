import { describe, expect, it, jest } from "@jest/globals";

import { GetProductCategory } from "../../../src/application/admin/get-product-category";
import { ProductCategoryError } from "../../../src/application/admin/product-category-errors";
import type {
  CreateProductCategoryInput,
  ProductCategoryRecord,
  ProductCategoryRepository,
  UpdateProductCategoryInput
} from "../../../src/ports/product-category-repository";

class ProductCategoryRepositoryDouble implements ProductCategoryRepository {
  create = jest
    .fn<(input: CreateProductCategoryInput) => Promise<ProductCategoryRecord>>();

  findAll = jest.fn<() => Promise<ProductCategoryRecord[]>>().mockResolvedValue([]);

  findById = jest
    .fn<(categoryId: string) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue({
      id: "category-id",
      name: "Electronics",
      description: "Phones, gadgets, and accessories",
      deductionPercentage: 12.5,
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    });

  findByName = jest
    .fn<(name: string) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(null);

  update = jest
    .fn<(input: UpdateProductCategoryInput) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(null);
}

describe("GetProductCategory", () => {
  it("returns a product category by id", async () => {
    const repository = new ProductCategoryRepositoryDouble();
    const getProductCategory = new GetProductCategory(repository);

    const result = await getProductCategory.execute({
      categoryId: "category-id"
    });

    expect(repository.findById).toHaveBeenCalledWith("category-id");
    expect(result).toMatchObject({
      name: "Electronics",
      deductionPercentage: 12.5
    });
  });

  it("throws when the product category does not exist", async () => {
    const repository = new ProductCategoryRepositoryDouble();
    repository.findById.mockResolvedValue(null);
    const getProductCategory = new GetProductCategory(repository);

    await expect(
      getProductCategory.execute({
        categoryId: "missing-id"
      })
    ).rejects.toBeInstanceOf(ProductCategoryError);
  });
});
