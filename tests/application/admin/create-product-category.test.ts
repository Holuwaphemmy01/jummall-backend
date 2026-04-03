import { describe, expect, it, jest } from "@jest/globals";

import { CreateProductCategory } from "../../../src/application/admin/create-product-category";
import type { ProductCategoryImageUploadInput } from "../../../src/application/admin/product-category-image";
import { ProductCategoryError } from "../../../src/application/admin/product-category-errors";
import type {
  DocumentStorage,
  UploadProductBrandImageInput,
  UploadProductCategoryImageInput,
  UploadProductImageInput,
  UploadSellerKycDocumentInput,
  UploadedDocument
} from "../../../src/ports/document-storage";
import type {
  CreateProductCategoryInput,
  ProductCategoryRecord,
  ProductCategoryRepository,
  UpdateProductCategoryInput
} from "../../../src/ports/product-category-repository";

class ProductCategoryRepositoryDouble implements ProductCategoryRepository {
  create = jest
    .fn<(input: CreateProductCategoryInput) => Promise<ProductCategoryRecord>>()
    .mockImplementation(async (input) => ({
      id: "category-id",
      name: input.name,
      description: input.description,
      deductionPercentage: input.deductionPercentage,
      image: input.image ?? null,
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    }));

  findAll = jest.fn<() => Promise<ProductCategoryRecord[]>>().mockResolvedValue([]);

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

class DocumentStorageDouble implements DocumentStorage {
  uploadSellerKycDocument = jest
    .fn<(input: UploadSellerKycDocumentInput) => Promise<UploadedDocument>>();

  uploadProductImage = jest
    .fn<(input: UploadProductImageInput) => Promise<UploadedDocument>>();

  uploadProductCategoryImage = jest
    .fn<(input: UploadProductCategoryImageInput) => Promise<UploadedDocument>>()
    .mockImplementation(async (input) => ({
      storagePath: `product-categories/${input.categoryName.toLowerCase()}/${input.fileName}`
    }));

  uploadProductBrandImage = jest
    .fn<(input: UploadProductBrandImageInput) => Promise<UploadedDocument>>();
}

function makeImageInput(
  overrides: Partial<ProductCategoryImageUploadInput> = {}
): ProductCategoryImageUploadInput {
  return {
    fileName: "electronics.jpg",
    mimeType: "image/jpeg",
    fileContents: Buffer.from("image"),
    ...overrides
  };
}

describe("CreateProductCategory", () => {
  it("creates a product category successfully", async () => {
    const repository = new ProductCategoryRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const createProductCategory = new CreateProductCategory(
      repository,
      documentStorage
    );

    const result = await createProductCategory.execute({
      name: "Electronics",
      description: "Phones, gadgets, and accessories",
      deductionPercentage: 12.5,
      image: makeImageInput()
    });

    expect(repository.findByName).toHaveBeenCalledWith("Electronics");
    expect(documentStorage.uploadProductCategoryImage).toHaveBeenCalledWith({
      categoryName: "Electronics",
      fileName: "electronics.jpg",
      mimeType: "image/jpeg",
      fileContents: Buffer.from("image")
    });
    expect(repository.create).toHaveBeenCalledWith({
      name: "Electronics",
      description: "Phones, gadgets, and accessories",
      deductionPercentage: 12.5,
      image: {
        storagePath: "product-categories/electronics/electronics.jpg",
        mimeType: "image/jpeg",
        originalFileName: "electronics.jpg"
      }
    });
    expect(result).toMatchObject({
      name: "Electronics",
      deductionPercentage: 12.5,
      image: {
        storagePath: "product-categories/electronics/electronics.jpg"
      }
    });
  });

  it("throws when the product category name already exists", async () => {
    const repository = new ProductCategoryRepositoryDouble();
    repository.findByName.mockResolvedValue({
      id: "category-id",
      name: "Electronics",
      description: "Existing category",
      deductionPercentage: 10,
      image: null,
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    });
    const documentStorage = new DocumentStorageDouble();
    const createProductCategory = new CreateProductCategory(
      repository,
      documentStorage
    );

    await expect(
      createProductCategory.execute({
        name: "Electronics",
        description: "Phones, gadgets, and accessories",
        deductionPercentage: 12.5,
        image: makeImageInput()
      })
    ).rejects.toBeInstanceOf(ProductCategoryError);
    expect(documentStorage.uploadProductCategoryImage).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("throws when the product category image type is unsupported", async () => {
    const repository = new ProductCategoryRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const createProductCategory = new CreateProductCategory(
      repository,
      documentStorage
    );

    await expect(
      createProductCategory.execute({
        name: "Electronics",
        description: "Phones, gadgets, and accessories",
        deductionPercentage: 12.5,
        image: makeImageInput({
          mimeType: "image/gif"
        })
      })
    ).rejects.toMatchObject({
      name: "ProductCategoryError",
      statusCode: 400,
      field: "image.mime_type"
    });
    expect(documentStorage.uploadProductCategoryImage).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
