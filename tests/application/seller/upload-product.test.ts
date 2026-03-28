import { describe, expect, it, jest } from "@jest/globals";

import {
  UploadProduct,
  UploadProductError
} from "../../../src/application/seller/upload-product";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  DocumentStorage,
  UploadProductImageInput as StorageUploadProductImageInput,
  UploadSellerKycDocumentInput,
  UploadedDocument
} from "../../../src/ports/document-storage";
import type {
  CreateProductCategoryInput,
  ProductCategoryRecord,
  ProductCategoryRepository,
  UpdateProductCategoryInput
} from "../../../src/ports/product-category-repository";
import type {
  CreateProductInput,
  ProductRecord,
  ProductRepository,
  UpdateProductStatusInput
} from "../../../src/ports/product-repository";
import type {
  MarkSellerKycAsSubmittedInput,
  SaveSellerKycDraftInput,
  SellerKycDocumentRecord,
  SellerKycRecord,
  SellerKycRepository,
  UpsertSellerKycDocumentInput
} from "../../../src/ports/seller-kyc-repository";

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  findByEmail = jest
    .fn<(email: string) => Promise<AuthUser | null>>()
    .mockResolvedValue(null);

  findById = jest
    .fn<(userId: string) => Promise<AuthUser | null>>()
    .mockResolvedValue({
      id: "seller-id",
      firstName: "Jane",
      lastName: "Doe",
      username: "jane.doe",
      email: "jane@example.com",
      phone: "+2348012345678",
      passwordHash: "hashed-password",
      role: "seller",
      accountStatus: "verified",
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    });

  updatePassword = jest
    .fn<(input: { userId: string; passwordHash: string }) => Promise<void>>()
    .mockResolvedValue();
}

class SellerKycRepositoryDouble implements SellerKycRepository {
  findByUserId = jest
    .fn<(userId: string) => Promise<SellerKycRecord | null>>()
    .mockResolvedValue({
      id: "kyc-id",
      userId: "seller-id",
      accountType: "individual",
      status: "approved",
      email: "jane@example.com",
      phone: "+2348012345678",
      address: "12 Allen Avenue",
      city: "Ikeja",
      state: "Lagos",
      country: "Nigeria",
      bankName: "Access Bank",
      bankAccountNumber: "0123456789",
      bankAccountName: "Jane Doe",
      fullName: "Jane Doe",
      dateOfBirth: new Date("1994-08-01T00:00:00.000Z"),
      gender: null,
      idType: "national_id",
      idNumber: "1234567890",
      businessName: null,
      registrationNumber: null,
      registeredBusinessAddress: null,
      representativeFirstName: null,
      representativeLastName: null,
      representativeRole: null,
      submittedAt: new Date("2026-03-27T00:00:00.000Z"),
      reviewedAt: new Date("2026-03-28T00:00:00.000Z"),
      reviewNote: null,
      documents: [],
      createdAt: new Date("2026-03-27T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    });

  saveDraft = jest
    .fn<(input: SaveSellerKycDraftInput) => Promise<SellerKycRecord>>();

  upsertDocument = jest
    .fn<(input: UpsertSellerKycDocumentInput) => Promise<SellerKycDocumentRecord>>();

  markAsSubmitted = jest
    .fn<(input: MarkSellerKycAsSubmittedInput) => Promise<SellerKycRecord>>();
}

class ProductCategoryRepositoryDouble implements ProductCategoryRepository {
  create = jest
    .fn<(input: CreateProductCategoryInput) => Promise<ProductCategoryRecord>>();

  findAll = jest.fn<() => Promise<ProductCategoryRecord[]>>().mockResolvedValue([]);

  findById = jest
    .fn<(categoryId: string) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue({
      id: "category-id",
      name: "Electronics",
      description: "Phones and gadgets",
      deductionPercentage: 12.5,
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    });

  findByName = jest
    .fn<(name: string) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(null);

  update = jest
    .fn<(input: UpdateProductCategoryInput) => Promise<ProductCategoryRecord | null>>()
    .mockResolvedValue(null);
}

class ProductRepositoryDouble implements ProductRepository {
  create = jest
    .fn<(input: CreateProductInput) => Promise<ProductRecord>>()
    .mockImplementation(async (input) => ({
      id: "product-id",
      sellerId: input.sellerId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      sku: input.sku ?? null,
      price: input.price,
      quantity: input.quantity,
      currency: input.currency,
      condition: input.condition,
      brand: input.brand ?? null,
      weightKg: input.weightKg,
      status: "pending_review",
      reviewNote: null,
      reviewedAt: null,
      images: input.images.map((image, index) => ({
        id: `image-${index + 1}`,
        productId: "product-id",
        storagePath: image.storagePath,
        mimeType: image.mimeType,
        originalFileName: image.originalFileName,
        position: image.position,
        createdAt: new Date("2026-03-28T00:00:00.000Z"),
        updatedAt: new Date("2026-03-28T00:00:00.000Z")
      })),
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z")
    }));

  findById = jest
    .fn<(productId: string) => Promise<ProductRecord | null>>()
    .mockResolvedValue(null);
  findBySellerId = jest
    .fn<(sellerId: string) => Promise<ProductRecord[]>>()
    .mockResolvedValue([]);
  findPendingReview = jest
    .fn<() => Promise<ProductRecord[]>>()
    .mockResolvedValue([]);
  updateStatus = jest.fn<(input: UpdateProductStatusInput) => Promise<ProductRecord | null>>();
}

class DocumentStorageDouble implements DocumentStorage {
  uploadSellerKycDocument = jest
    .fn<(input: UploadSellerKycDocumentInput) => Promise<UploadedDocument>>();

  uploadProductImage = jest
    .fn<(input: StorageUploadProductImageInput) => Promise<UploadedDocument>>()
    .mockImplementation(async (input) => ({
      storagePath: `products/${input.sellerId}/${input.fileName}`
    }));
}

describe("UploadProduct", () => {
  it("uploads a product successfully for a verified seller with approved KYC", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const sellerKycRepository = new SellerKycRepositoryDouble();
    const productCategoryRepository = new ProductCategoryRepositoryDouble();
    const productRepository = new ProductRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const uploadProduct = new UploadProduct(
      authenticationRepository,
      sellerKycRepository,
      productCategoryRepository,
      productRepository,
      documentStorage
    );

    const result = await uploadProduct.execute({
      sellerId: "seller-id",
      categoryId: "category-id",
      name: "iPhone 13",
      description: "Clean iPhone 13 with 128GB storage",
      sku: "IPH13-128",
      price: 850000,
      quantity: 4,
      currency: "NGN",
      condition: "new",
      brand: "Apple",
      weightKg: 0.24,
      images: [
        {
          fileName: "front.jpg",
          mimeType: "image/jpeg",
          fileContents: Buffer.from("front")
        },
        {
          fileName: "back.jpg",
          mimeType: "image/png",
          fileContents: Buffer.from("back")
        }
      ]
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("seller-id");
    expect(sellerKycRepository.findByUserId).toHaveBeenCalledWith("seller-id");
    expect(productCategoryRepository.findById).toHaveBeenCalledWith("category-id");
    expect(documentStorage.uploadProductImage).toHaveBeenCalledTimes(2);
    expect(productRepository.create).toHaveBeenCalledWith({
      sellerId: "seller-id",
      categoryId: "category-id",
      name: "iPhone 13",
      description: "Clean iPhone 13 with 128GB storage",
      sku: "IPH13-128",
      price: 850000,
      quantity: 4,
      currency: "NGN",
      condition: "new",
      brand: "Apple",
      weightKg: 0.24,
      images: [
        {
          storagePath: "products/seller-id/front.jpg",
          mimeType: "image/jpeg",
          originalFileName: "front.jpg",
          position: 0
        },
        {
          storagePath: "products/seller-id/back.jpg",
          mimeType: "image/png",
          originalFileName: "back.jpg",
          position: 1
        }
      ]
    });
    expect(result.status).toBe("pending_review");
  });

  it("throws when seller KYC is not approved", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const sellerKycRepository = new SellerKycRepositoryDouble();
    sellerKycRepository.findByUserId.mockResolvedValue({
      ...(awaitableApprovedKyc()),
      status: "submitted"
    });
    const uploadProduct = new UploadProduct(
      authenticationRepository,
      sellerKycRepository,
      new ProductCategoryRepositoryDouble(),
      new ProductRepositoryDouble(),
      new DocumentStorageDouble()
    );

    await expect(
      uploadProduct.execute({
        sellerId: "seller-id",
        categoryId: "category-id",
        name: "iPhone 13",
        description: "Clean iPhone 13 with 128GB storage",
        price: 850000,
        quantity: 4,
        currency: "NGN",
        condition: "new",
        weightKg: 0.24,
        images: [
          {
            fileName: "front.jpg",
            mimeType: "image/jpeg",
            fileContents: Buffer.from("front")
          }
        ]
      })
    ).rejects.toBeInstanceOf(UploadProductError);
  });

  it("throws when category does not exist", async () => {
    const productCategoryRepository = new ProductCategoryRepositoryDouble();
    productCategoryRepository.findById.mockResolvedValue(null);
    const uploadProduct = new UploadProduct(
      new AuthenticationRepositoryDouble(),
      new SellerKycRepositoryDouble(),
      productCategoryRepository,
      new ProductRepositoryDouble(),
      new DocumentStorageDouble()
    );

    await expect(
      uploadProduct.execute({
        sellerId: "seller-id",
        categoryId: "missing-category-id",
        name: "iPhone 13",
        description: "Clean iPhone 13 with 128GB storage",
        price: 850000,
        quantity: 4,
        currency: "NGN",
        condition: "new",
        weightKg: 0.24,
        images: [
          {
            fileName: "front.jpg",
            mimeType: "image/jpeg",
            fileContents: Buffer.from("front")
          }
        ]
      })
    ).rejects.toBeInstanceOf(UploadProductError);
  });
});

function awaitableApprovedKyc(): SellerKycRecord {
  return {
    id: "kyc-id",
    userId: "seller-id",
    accountType: "individual",
    status: "approved",
    email: "jane@example.com",
    phone: "+2348012345678",
    address: "12 Allen Avenue",
    city: "Ikeja",
    state: "Lagos",
    country: "Nigeria",
    bankName: "Access Bank",
    bankAccountNumber: "0123456789",
    bankAccountName: "Jane Doe",
    fullName: "Jane Doe",
    dateOfBirth: new Date("1994-08-01T00:00:00.000Z"),
    gender: null,
    idType: "national_id",
    idNumber: "1234567890",
    businessName: null,
    registrationNumber: null,
    registeredBusinessAddress: null,
    representativeFirstName: null,
    representativeLastName: null,
    representativeRole: null,
    submittedAt: new Date("2026-03-27T00:00:00.000Z"),
    reviewedAt: new Date("2026-03-28T00:00:00.000Z"),
    reviewNote: null,
    documents: [],
    createdAt: new Date("2026-03-27T00:00:00.000Z"),
    updatedAt: new Date("2026-03-28T00:00:00.000Z")
  };
}
