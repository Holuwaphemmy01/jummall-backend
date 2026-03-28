import { describe, expect, it, jest } from "@jest/globals";

import { ProductCategoryError } from "../../../src/application/admin/product-category-errors";
import { UpdateProductCategory } from "../../../src/application/admin/update-product-category";
import type {
  CreateProductCategoryInput,
  ProductCategoryRecord,
  ProductCategoryRepository,
  UpdateProductCategoryInput
} from "../../../src/ports/product-category-repository";

function makeCategory(): ProductCategoryRecord {
  return {
    id: "category-id",
    name: "Electronics",
    description: "Phones, gadgets, and accessories",
    deductionPercentage: 12.5,
    createdAt: new Date("2026-03-28T00:00:00.000Z"),
    updatedAt: new Date("2026-03-28T00:00:00.000Z")
  };
}

class ProductCategoryRepositoryDouble implements ProductCategoryRepository {
  create = jest
    .fn<(input: CreateProductCategoryInput) => Promise<ProductCategoryRecord>>();

  findAll = jest.fn<() => Promise<ProductCategoryRecord[]>>().mockResolvedValue([]);

  findById = jest
    .fn<(categoryId: string) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(makeCategory());

  findByName = jest
    .fn<(name: string) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(null);

  update = jest
    .fn<(input: UpdateProductCategoryInput) => Promise<ProductCategoryRecord | null>>()
    .mockImplementation(async (input) => ({
      ...makeCategory(),
      name: input.name ?? "Electronics",
      description: input.description ?? "Phones, gadgets, and accessories",
      deductionPercentage: input.deductionPercentage ?? 12.5
    }));
}

describe("UpdateProductCategory", () => {
  it("updates a product category successfully", async () => {
    const repository = new ProductCategoryRepositoryDouble();
    const updateProductCategory = new UpdateProductCategory(repository);

    const result = await updateProductCategory.execute({
      categoryId: "category-id",
      description: "Updated description",
      deductionPercentage: 15
    });

    expect(repository.update).toHaveBeenCalledWith({
      categoryId: "category-id",
      description: "Updated description",
      deductionPercentage: 15
    });
    expect(result).toMatchObject({
      description: "Updated description",
      deductionPercentage: 15
    });
  });

  it("throws when another category already uses the new name", async () => {
    const repository = new ProductCategoryRepositoryDouble();
    repository.findByName.mockResolvedValue({
      id: "other-category-id",
      name: "Groceries",
      description: "Food and pantry",
      deductionPercentage: 8,
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    });
    const updateProductCategory = new UpdateProductCategory(repository);

    await expect(
      updateProductCategory.execute({
        categoryId: "category-id",
        name: "Groceries"
      })
    ).rejects.toBeInstanceOf(ProductCategoryError);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
