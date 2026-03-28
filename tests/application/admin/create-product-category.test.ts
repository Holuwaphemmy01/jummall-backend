import { describe, expect, it, jest } from "@jest/globals";

import { CreateProductCategory } from "../../../src/application/admin/create-product-category";
import { ProductCategoryError } from "../../../src/application/admin/product-category-errors";
import type {
  CreateProductCategoryInput,
  ProductCategoryRecord,
  ProductCategoryRepository,
  UpdateProductCategoryInput
} from "../../../src/ports/product-category-repository";

class ProductCategoryRepositoryDouble implements ProductCategoryRepository {
  create = jest
    .fn<(input: CreateProductCategoryInput) => Promise<ProductCategoryRecord>>()
    .mockImplementation(async (input) => ({
      id: "category-id",
      name: input.name,
      description: input.description,
      deductionPercentage: input.deductionPercentage,
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    }));

  findAll = jest.fn<() => Promise<ProductCategoryRecord[]>>().mockResolvedValue([]);

  findById = jest
    .fn<(categoryId: string) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(null);

  findByName = jest
    .fn<(name: string) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(null);

  update = jest
    .fn<(input: UpdateProductCategoryInput) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(null);
}

describe("CreateProductCategory", () => {
  it("creates a product category successfully", async () => {
    const repository = new ProductCategoryRepositoryDouble();
    const createProductCategory = new CreateProductCategory(repository);

    const result = await createProductCategory.execute({
      name: "Electronics",
      description: "Phones, gadgets, and accessories",
      deductionPercentage: 12.5
    });

    expect(repository.findByName).toHaveBeenCalledWith("Electronics");
    expect(repository.create).toHaveBeenCalledWith({
      name: "Electronics",
      description: "Phones, gadgets, and accessories",
      deductionPercentage: 12.5
    });
    expect(result).toMatchObject({
      name: "Electronics",
      deductionPercentage: 12.5
    });
  });

  it("throws when the product category name already exists", async () => {
    const repository = new ProductCategoryRepositoryDouble();
    repository.findByName.mockResolvedValue({
      id: "category-id",
      name: "Electronics",
      description: "Existing category",
      deductionPercentage: 10,
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    });
    const createProductCategory = new CreateProductCategory(repository);

    await expect(
      createProductCategory.execute({
        name: "Electronics",
        description: "Phones, gadgets, and accessories",
        deductionPercentage: 12.5
      })
    ).rejects.toBeInstanceOf(ProductCategoryError);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
