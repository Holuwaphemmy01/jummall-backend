import { describe, expect, it, jest } from "@jest/globals";

import { ListProductBrands } from "../../../src/application/admin/list-product-brands";
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
      id: "brand-id",
      name: "Apple",
      description: "Consumer electronics brand",
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
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

describe("ListProductBrands", () => {
  it("returns all product brands", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    const listProductBrands = new ListProductBrands(productBrandRepository);

    const result = await listProductBrands.execute();

    expect(productBrandRepository.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Apple");
  });
});
