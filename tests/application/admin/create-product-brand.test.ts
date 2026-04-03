import { describe, expect, it, jest } from "@jest/globals";

import { CreateProductBrand } from "../../../src/application/admin/create-product-brand";
import type { ProductBrandImageUploadInput } from "../../../src/application/admin/product-brand-image";
import { ProductBrandError } from "../../../src/application/admin/product-brand-errors";
import type {
  DocumentStorage,
  UploadProductBrandImageInput,
  UploadProductCategoryImageInput,
  UploadProductImageInput,
  UploadSellerKycDocumentInput,
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
    .fn<(input: CreateProductBrandInput) => Promise<ProductBrandRecord>>()
    .mockImplementation(async (input) => ({
      id: "brand-id",
      name: input.name,
      description: input.description,
      image: input.image ?? null,
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
}

function makeImageInput(
  overrides: Partial<ProductBrandImageUploadInput> = {}
): ProductBrandImageUploadInput {
  return {
    fileName: "apple.jpg",
    mimeType: "image/jpeg",
    fileContents: Buffer.from("image"),
    ...overrides
  };
}

describe("CreateProductBrand", () => {
  it("creates a product brand when the name is unique", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const createProductBrand = new CreateProductBrand(
      productBrandRepository,
      documentStorage
    );

    const result = await createProductBrand.execute({
      name: "Apple",
      description: "Consumer electronics brand",
      image: makeImageInput()
    });

    expect(productBrandRepository.findByName).toHaveBeenCalledWith("Apple");
    expect(documentStorage.uploadProductBrandImage).toHaveBeenCalledWith({
      brandName: "Apple",
      fileName: "apple.jpg",
      mimeType: "image/jpeg",
      fileContents: Buffer.from("image")
    });
    expect(productBrandRepository.create).toHaveBeenCalledWith({
      name: "Apple",
      description: "Consumer electronics brand",
      image: {
        storagePath: "product-brands/apple/apple.jpg",
        mimeType: "image/jpeg",
        originalFileName: "apple.jpg"
      }
    });
    expect(result).toMatchObject({
      name: "Apple",
      image: {
        storagePath: "product-brands/apple/apple.jpg"
      }
    });
  });

  it("throws when the product brand name already exists", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    productBrandRepository.findByName.mockResolvedValue({
      id: "brand-id",
      name: "Apple",
      description: "Consumer electronics brand",
      image: null,
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    });
    const documentStorage = new DocumentStorageDouble();
    const createProductBrand = new CreateProductBrand(
      productBrandRepository,
      documentStorage
    );

    await expect(
      createProductBrand.execute({
        name: "Apple",
        description: "Consumer electronics brand",
        image: makeImageInput()
      })
    ).rejects.toBeInstanceOf(ProductBrandError);
    expect(documentStorage.uploadProductBrandImage).not.toHaveBeenCalled();
    expect(productBrandRepository.create).not.toHaveBeenCalled();
  });

  it("throws when the product brand image type is unsupported", async () => {
    const productBrandRepository = new ProductBrandRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const createProductBrand = new CreateProductBrand(
      productBrandRepository,
      documentStorage
    );

    await expect(
      createProductBrand.execute({
        name: "Apple",
        description: "Consumer electronics brand",
        image: makeImageInput({
          mimeType: "image/gif"
        })
      })
    ).rejects.toMatchObject({
      name: "ProductBrandError",
      statusCode: 400,
      field: "image.mime_type"
    });
    expect(documentStorage.uploadProductBrandImage).not.toHaveBeenCalled();
    expect(productBrandRepository.create).not.toHaveBeenCalled();
  });
});
