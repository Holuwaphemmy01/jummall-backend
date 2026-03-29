import { describe, expect, it, jest } from "@jest/globals";

import { GetProductBrand } from "../../../src/application/admin/get-product-brand";
import { ProductBrandError } from "../../../src/application/admin/product-brand-errors";
import type {
  CreateProductBrandInput,
  ProductBrandRecord,
  ProductBrandRepository,
  UpdateProductBrandInput
} from "../../../src/ports/product-brand-repository";

class ProductBrandRepositoryDouble implements ProductBrandRepository {
  create = jest
    .fn<(input: CreateProductBrandInput) => Promise<ProductBrandRecord>>();

  findAll = jest.fn<() => Promise<ProductBrandRecord[]>>().mockResolvedValue([]);

  findById = jest
    .fn<(brandId: string) => Promise<ProductBrandRecord | null>>()
    .mockResolvedValue({
      id: "brand-id",
      name: "Apple",
      description: "Consumer electronics brand",
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    });

  findByName = jest
    .fn<(name: string) => Promise<ProductBrandRecord | null>>()
    .mockResolvedValue(null);

  update = jest
    .fn<(input: UpdateProductBrandInput) => Promise<ProductBrandRecord | null>>()
    .mockResolvedValue(null);
}

describe("GetProductBrand", () => {
  it("returns a product brand by id", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    const getProductBrand = new GetProductBrand(productBrandRepository);

    const result = await getProductBrand.execute({ brandId: "brand-id" });

    expect(productBrandRepository.findById).toHaveBeenCalledWith("brand-id");
    expect(result.name).toBe("Apple");
  });

  it("throws when the product brand does not exist", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    productBrandRepository.findById.mockResolvedValue(null);
    const getProductBrand = new GetProductBrand(productBrandRepository);

    await expect(
      getProductBrand.execute({ brandId: "missing-brand-id" })
    ).rejects.toBeInstanceOf(ProductBrandError);
  });
});
