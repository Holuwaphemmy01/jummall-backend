import { describe, expect, it, jest } from "@jest/globals";

import { ProductBrandError } from "../../../src/application/admin/product-brand-errors";
import { UpdateProductBrand } from "../../../src/application/admin/update-product-brand";
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
    .mockResolvedValue(null);

  findByName = jest
    .fn<(name: string) => Promise<ProductBrandRecord | null>>()
    .mockResolvedValue(null);

  update = jest
    .fn<(input: UpdateProductBrandInput) => Promise<ProductBrandRecord | null>>()
    .mockImplementation(async (input) => ({
      id: input.brandId,
      name: input.name ?? "Apple",
      description: input.description ?? "Consumer electronics brand",
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T01:00:00.000Z")
    }));
}

describe("UpdateProductBrand", () => {
  it("updates a product brand", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    const updateProductBrand = new UpdateProductBrand(productBrandRepository);

    const result = await updateProductBrand.execute({
      brandId: "brand-id",
      name: "Apple",
      description: "Updated brand description"
    });

    expect(productBrandRepository.update).toHaveBeenCalledWith({
      brandId: "brand-id",
      name: "Apple",
      description: "Updated brand description"
    });
    expect(result.description).toBe("Updated brand description");
  });

  it("throws when another product brand already has the new name", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    productBrandRepository.findByName.mockResolvedValue({
      id: "another-brand-id",
      name: "Apple",
      description: "Consumer electronics brand",
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    });
    const updateProductBrand = new UpdateProductBrand(productBrandRepository);

    await expect(
      updateProductBrand.execute({
        brandId: "brand-id",
        name: "Apple"
      })
    ).rejects.toBeInstanceOf(ProductBrandError);
  });
});
