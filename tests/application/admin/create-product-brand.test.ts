import { describe, expect, it, jest } from "@jest/globals";

import { CreateProductBrand } from "../../../src/application/admin/create-product-brand";
import { ProductBrandError } from "../../../src/application/admin/product-brand-errors";
import type {
  CreateProductBrandInput,
  ProductBrandRecord,
  ProductBrandRepository,
  UpdateProductBrandInput
} from "../../../src/ports/product-brand-repository";

class ProductBrandRepositoryDouble implements ProductBrandRepository {
  create = jest
    .fn<(input: CreateProductBrandInput) => Promise<ProductBrandRecord>>()
    .mockImplementation(async (input) => ({
      id: "brand-id",
      name: input.name,
      description: input.description,
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    }));

  findAll = jest.fn<() => Promise<ProductBrandRecord[]>>().mockResolvedValue([]);

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

describe("CreateProductBrand", () => {
  it("creates a product brand when the name is unique", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    const createProductBrand = new CreateProductBrand(productBrandRepository);

    const result = await createProductBrand.execute({
      name: "Apple",
      description: "Consumer electronics brand"
    });

    expect(productBrandRepository.findByName).toHaveBeenCalledWith("Apple");
    expect(productBrandRepository.create).toHaveBeenCalledWith({
      name: "Apple",
      description: "Consumer electronics brand"
    });
    expect(result.name).toBe("Apple");
  });

  it("throws when the product brand name already exists", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    productBrandRepository.findByName.mockResolvedValue({
      id: "brand-id",
      name: "Apple",
      description: "Consumer electronics brand",
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    });
    const createProductBrand = new CreateProductBrand(productBrandRepository);

    await expect(
      createProductBrand.execute({
        name: "Apple",
        description: "Consumer electronics brand"
      })
    ).rejects.toBeInstanceOf(ProductBrandError);
  });
});
