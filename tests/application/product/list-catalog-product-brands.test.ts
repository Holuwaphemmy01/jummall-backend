import { describe, expect, it, jest } from "@jest/globals";

import { ListCatalogProductBrands } from "../../../src/application/product/list-catalog-product-brands";
import type {
  CreateProductBrandInput,
  ProductBrandRecord,
  ProductBrandRepository,
  UpdateProductBrandInput
} from "../../../src/ports/product-brand-repository";

class ProductBrandRepositoryDouble implements ProductBrandRepository {
  create = jest
    .fn<(input: CreateProductBrandInput) => Promise<ProductBrandRecord>>();

  findAll = jest.fn<() => Promise<ProductBrandRecord[]>>().mockResolvedValue([
    {
      id: "brand-a",
      name: "Apple",
      description: "Consumer electronics brand",
      image: {
        storagePath: "product-brands/apple/apple.jpg",
        mimeType: "image/jpeg",
        originalFileName: "apple.jpg"
      },
      createdAt: new Date("2026-04-03T00:00:00.000Z"),
      updatedAt: new Date("2026-04-03T00:00:00.000Z")
    },
    {
      id: "brand-b",
      name: "Samsung",
      description: "Consumer electronics and appliances",
      image: null,
      createdAt: new Date("2026-04-04T00:00:00.000Z"),
      updatedAt: new Date("2026-04-04T00:00:00.000Z")
    }
  ]);

  findById = jest
    .fn<(brandId: string) => Promise<ProductBrandRecord | null>>()
    .mockResolvedValue(null);

  findByName = jest
    .fn<(name: string) => Promise<ProductBrandRecord | null>>()
    .mockResolvedValue(null);

  update = jest
    .fn<(input: UpdateProductBrandInput) => Promise<ProductBrandRecord | null>>()
    .mockResolvedValue(null);
}

describe("ListCatalogProductBrands", () => {
  it("returns all catalog product brands in repository order", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    const listCatalogProductBrands = new ListCatalogProductBrands(
      productBrandRepository
    );

    const result = await listCatalogProductBrands.execute();

    expect(productBrandRepository.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "brand-a",
      name: "Apple",
      image: {
        storagePath: "product-brands/apple/apple.jpg"
      }
    });
    expect(result[1]).toMatchObject({
      id: "brand-b",
      name: "Samsung",
      image: null
    });
  });
});
