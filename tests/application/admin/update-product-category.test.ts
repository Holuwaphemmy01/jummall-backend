import { describe, expect, it, jest } from "@jest/globals";

import type { ProductCategoryImageUploadInput } from "../../../src/application/admin/product-category-image";
import { ProductCategoryError } from "../../../src/application/admin/product-category-errors";
import { UpdateProductCategory } from "../../../src/application/admin/update-product-category";
import type {
  DocumentStorage,
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

function makeCategory(): ProductCategoryRecord {
  return {
    id: "category-id",
    name: "Electronics",
    description: "Phones, gadgets, and accessories",
    deductionPercentage: 12.5,
    image: {
      storagePath: "product-categories/electronics/current.jpg",
      mimeType: "image/jpeg",
      originalFileName: "current.jpg"
    },
    createdAt: new Date("2026-03-28T00:00:00.000Z"),
    updatedAt: new Date("2026-03-28T00:00:00.000Z")
  };
}

class ProductCategoryRepositoryDouble implements ProductCategoryRepository {
  create = jest
    .fn<(input: CreateProductCategoryInput) => Promise<ProductCategoryRecord>>();

  findAll = jest.fn<() => Promise<ProductCategoryRecord[]>>().mockResolvedValue([]);

  findById = jest
    .fn<(categoryId: string) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(makeCategory());

  findByName = jest
    .fn<(name: string) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(null);

  update = jest
    .fn<(input: UpdateProductCategoryInput) => Promise<ProductCategoryRecord | null>>()
    .mockImplementation(async (input) => ({
      ...makeCategory(),
      name: input.name ?? "Electronics",
      description: input.description ?? "Phones, gadgets, and accessories",
      deductionPercentage: input.deductionPercentage ?? 12.5,
      image: input.image ?? makeCategory().image
    }));
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
}

function makeImageInput(
  overrides: Partial<ProductCategoryImageUploadInput> = {}
): ProductCategoryImageUploadInput {
  return {
    fileName: "electronics-banner.png",
    mimeType: "image/png",
    fileContents: Buffer.from("new-image"),
    ...overrides
  };
}

describe("UpdateProductCategory", () => {
  it("updates a product category successfully without changing the image", async () => {
    const repository = new ProductCategoryRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const updateProductCategory = new UpdateProductCategory(
      repository,
      documentStorage
    );

    const result = await updateProductCategory.execute({
      categoryId: "category-id",
      description: "Updated description",
      deductionPercentage: 15
    });

    expect(repository.update).toHaveBeenCalledWith({
      categoryId: "category-id",
      name: undefined,
      description: "Updated description",
      deductionPercentage: 15,
      image: undefined
    });
    expect(documentStorage.uploadProductCategoryImage).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      description: "Updated description",
      deductionPercentage: 15,
      image: {
        storagePath: "product-categories/electronics/current.jpg"
      }
    });
  });

  it("replaces the category image when a new image is provided", async () => {
    const repository = new ProductCategoryRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const updateProductCategory = new UpdateProductCategory(
      repository,
      documentStorage
    );

    const result = await updateProductCategory.execute({
      categoryId: "category-id",
      image: makeImageInput()
    });

    expect(documentStorage.uploadProductCategoryImage).toHaveBeenCalledWith({
      categoryName: "Electronics",
      fileName: "electronics-banner.png",
      mimeType: "image/png",
      fileContents: Buffer.from("new-image")
    });
    expect(repository.update).toHaveBeenCalledWith({
      categoryId: "category-id",
      name: undefined,
      description: undefined,
      deductionPercentage: undefined,
      image: {
        storagePath: "product-categories/electronics/electronics-banner.png",
        mimeType: "image/png",
        originalFileName: "electronics-banner.png"
      }
    });
    expect(result).toMatchObject({
      image: {
        storagePath: "product-categories/electronics/electronics-banner.png"
      }
    });
  });

  it("throws when another category already uses the new name", async () => {
    const repository = new ProductCategoryRepositoryDouble();
    repository.findByName.mockResolvedValue({
      id: "other-category-id",
      name: "Groceries",
      description: "Food and pantry",
      deductionPercentage: 8,
      image: null,
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    });
    const documentStorage = new DocumentStorageDouble();
    const updateProductCategory = new UpdateProductCategory(
      repository,
      documentStorage
    );

    await expect(
      updateProductCategory.execute({
        categoryId: "category-id",
        name: "Groceries"
      })
    ).rejects.toBeInstanceOf(ProductCategoryError);
    expect(documentStorage.uploadProductCategoryImage).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });
});
