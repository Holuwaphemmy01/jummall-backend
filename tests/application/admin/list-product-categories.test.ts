import { describe, expect, it, jest } from "@jest/globals";

import { ListProductCategories } from "../../../src/application/admin/list-product-categories";
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
      image: {
        storagePath: "product-categories/electronics/electronics.jpg",
        mimeType: "image/jpeg",
        originalFileName: "electronics.jpg"
      },
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    }
  ]);

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

describe("ListProductCategories", () => {
  it("returns all product categories", async () => {
    const repository = new ProductCategoryRepositoryDouble();
    const listProductCategories = new ListProductCategories(repository);

    const result = await listProductCategories.execute();

    expect(repository.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "Electronics",
      deductionPercentage: 12.5,
      image: {
        storagePath: "product-categories/electronics/electronics.jpg"
      }
    });
  });
});
