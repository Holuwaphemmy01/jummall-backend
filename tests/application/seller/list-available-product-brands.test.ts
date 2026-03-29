import { describe, expect, it, jest } from "@jest/globals";

import { ListAvailableProductBrands } from "../../../src/application/seller/list-available-product-brands";
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
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
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

describe("ListAvailableProductBrands", () => {
  it("returns all available product brands for sellers", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    const listAvailableProductBrands = new ListAvailableProductBrands(
      productBrandRepository
    );

    const result = await listAvailableProductBrands.execute();

    expect(productBrandRepository.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "brand-id",
      name: "Apple"
    });
  });
});
