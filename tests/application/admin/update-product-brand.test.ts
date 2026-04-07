import { describe, expect, it, jest } from "@jest/globals";

import type { ProductBrandImageUploadInput } from "../../../src/application/admin/product-brand-image";
import { ProductBrandError } from "../../../src/application/admin/product-brand-errors";
import { UpdateProductBrand } from "../../../src/application/admin/update-product-brand";
import type {
  DocumentStorage,
  UploadProductBrandImageInput,
  UploadProductCategoryImageInput,
  UploadProductImageInput,
  UploadSellerKycDocumentInput,
  UploadSliderImageInput,
  UploadedDocument
} from "../../../src/ports/document-storage";
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
      image: {
        storagePath: "product-brands/apple/apple.jpg",
        mimeType: "image/jpeg",
        originalFileName: "apple.jpg"
      },
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    });

  findByName = jest
    .fn<(name: string) => Promise<ProductBrandRecord | null>>()
    .mockResolvedValue(null);

  update = jest
    .fn<(input: UpdateProductBrandInput) => Promise<ProductBrandRecord | null>>()
    .mockImplementation(async (input) => ({
      id: input.brandId,
      name: input.name ?? "Apple",
      description: input.description ?? "Consumer electronics brand",
      image:
        input.image ?? {
          storagePath: "product-brands/apple/apple.jpg",
          mimeType: "image/jpeg",
          originalFileName: "apple.jpg"
        },
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T01:00:00.000Z")
    }));
}

class DocumentStorageDouble implements DocumentStorage {
  uploadSellerKycDocument = jest
    .fn<(input: UploadSellerKycDocumentInput) => Promise<UploadedDocument>>();

  uploadProductImage = jest
    .fn<(input: UploadProductImageInput) => Promise<UploadedDocument>>();

  uploadProductCategoryImage = jest
    .fn<(input: UploadProductCategoryImageInput) => Promise<UploadedDocument>>();

  uploadProductBrandImage = jest
    .fn<(input: UploadProductBrandImageInput) => Promise<UploadedDocument>>()
    .mockImplementation(async (input) => ({
      storagePath: `product-brands/${input.brandName.toLowerCase()}/${input.fileName}`
    }));

  uploadSliderImage = jest
    .fn<(input: UploadSliderImageInput) => Promise<UploadedDocument>>();
}

function makeImageInput(
  overrides: Partial<ProductBrandImageUploadInput> = {}
): ProductBrandImageUploadInput {
  return {
    fileName: "apple-banner.png",
    mimeType: "image/png",
    fileContents: Buffer.from("image"),
    ...overrides
  };
}

describe("UpdateProductBrand", () => {
  it("updates a product brand without replacing the current image", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const updateProductBrand = new UpdateProductBrand(
      productBrandRepository,
      documentStorage
    );

    const result = await updateProductBrand.execute({
      brandId: "brand-id",
      name: "Apple",
      description: "Updated brand description"
    });

    expect(productBrandRepository.findById).toHaveBeenCalledWith("brand-id");
    expect(productBrandRepository.update).toHaveBeenCalledWith({
      brandId: "brand-id",
      name: "Apple",
      description: "Updated brand description",
      image: undefined
    });
    expect(documentStorage.uploadProductBrandImage).not.toHaveBeenCalled();
    expect(result.description).toBe("Updated brand description");
    expect(result.image?.storagePath).toBe("product-brands/apple/apple.jpg");
  });

  it("replaces the brand image when a new image is provided", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const updateProductBrand = new UpdateProductBrand(
      productBrandRepository,
      documentStorage
    );

    const result = await updateProductBrand.execute({
      brandId: "brand-id",
      image: makeImageInput()
    });

    expect(documentStorage.uploadProductBrandImage).toHaveBeenCalledWith({
      brandName: "Apple",
      fileName: "apple-banner.png",
      mimeType: "image/png",
      fileContents: Buffer.from("image")
    });
    expect(productBrandRepository.update).toHaveBeenCalledWith({
      brandId: "brand-id",
      name: undefined,
      description: undefined,
      image: {
        storagePath: "product-brands/apple/apple-banner.png",
        mimeType: "image/png",
        originalFileName: "apple-banner.png"
      }
    });
    expect(result.image?.storagePath).toBe(
      "product-brands/apple/apple-banner.png"
    );
  });

  it("throws when another product brand already has the new name", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    productBrandRepository.findByName.mockResolvedValue({
      id: "another-brand-id",
      name: "Apple",
      description: "Consumer electronics brand",
      image: null,
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    });
    const updateProductBrand = new UpdateProductBrand(
      productBrandRepository,
      new DocumentStorageDouble()
    );

    await expect(
      updateProductBrand.execute({
        brandId: "brand-id",
        name: "Apple"
      })
    ).rejects.toBeInstanceOf(ProductBrandError);
  });
});
