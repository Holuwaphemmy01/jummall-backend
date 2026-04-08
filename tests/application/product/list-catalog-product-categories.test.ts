import { describe, expect, it, jest } from "@jest/globals";

import { ListCatalogProductCategories } from "../../../src/application/product/list-catalog-product-categories";
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
      id: "category-a",
      name: "Appliances",
      description: "Home appliances",
      deductionPercentage: 10,
      image: null,
      createdAt: new Date("2026-04-07T00:00:00.000Z"),
      updatedAt: new Date("2026-04-07T00:00:00.000Z")
    },
    {
      id: "category-b",
      name: "Electronics",
      description: "Phones, gadgets, and accessories",
      deductionPercentage: 12.5,
      image: {
        storagePath: "product-categories/electronics/electronics.jpg",
        mimeType: "image/jpeg",
        originalFileName: "electronics.jpg"
      },
      createdAt: new Date("2026-04-08T00:00:00.000Z"),
      updatedAt: new Date("2026-04-08T00:00:00.000Z")
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

describe("ListCatalogProductCategories", () => {
  it("returns all catalog product categories in repository order", async () => {
    const productCategoryRepository = new ProductCategoryRepositoryDouble();
    const listCatalogProductCategories = new ListCatalogProductCategories(
      productCategoryRepository
    );

    const result = await listCatalogProductCategories.execute();

    expect(productCategoryRepository.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "category-a",
      name: "Appliances"
    });
    expect(result[1]).toMatchObject({
      id: "category-b",
      name: "Electronics",
      image: {
        storagePath: "product-categories/electronics/electronics.jpg"
      }
    });
  });
});
