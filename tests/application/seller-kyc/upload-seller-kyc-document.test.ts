import { describe, expect, it, jest } from "@jest/globals";

import { SellerKycError } from "../../../src/application/seller-kyc/seller-kyc-errors";
import { UploadSellerKycDocument } from "../../../src/application/seller-kyc/upload-seller-kyc-document";
import type {
  DocumentStorage,
  UploadSellerKycDocumentInput as StorageUploadInput,
  UploadedDocument
} from "../../../src/ports/document-storage";
import type {
  MarkSellerKycAsSubmittedInput,
  SaveSellerKycDraftInput,
  SellerKycDocumentRecord,
  SellerKycRecord,
  SellerKycRepository,
  UpsertSellerKycDocumentInput
} from "../../../src/ports/seller-kyc-repository";

function makeKycRecord(
  overrides: Partial<SellerKycRecord> = {}
): SellerKycRecord {
  return {
    id: "kyc-id",
    userId: "seller-id",
    accountType: "individual",
    status: "in_progress",
    email: null,
    phone: null,
    address: null,
    city: null,
    state: null,
    country: "Nigeria",
    bankName: null,
    bankAccountNumber: null,
    bankAccountName: null,
    fullName: null,
    dateOfBirth: null,
    gender: null,
    idType: null,
    idNumber: null,
    businessName: null,
    registrationNumber: null,
    registeredBusinessAddress: null,
    representativeFirstName: null,
    representativeLastName: null,
    representativeRole: null,
    submittedAt: null,
    reviewedAt: null,
    reviewNote: null,
    documents: [],
    createdAt: new Date("2026-03-26T00:00:00.000Z"),
    updatedAt: new Date("2026-03-26T00:00:00.000Z"),
    ...overrides
  };
}

class SellerKycRepositoryDouble implements SellerKycRepository {
  findByUserId = jest
    .fn<(userId: string) => Promise<SellerKycRecord | null>>()
    .mockResolvedValue(makeKycRecord());

  saveDraft = jest.fn<(input: SaveSellerKycDraftInput) => Promise<SellerKycRecord>>();

  upsertDocument = jest
    .fn<(input: UpsertSellerKycDocumentInput) => Promise<SellerKycDocumentRecord>>()
    .mockImplementation(async (input) => ({
      id: "document-id",
      documentType: input.documentType,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      originalFileName: input.originalFileName,
      createdAt: new Date("2026-03-26T00:00:00.000Z"),
      updatedAt: new Date("2026-03-26T00:00:00.000Z")
    }));

  markAsSubmitted = jest
    .fn<(input: MarkSellerKycAsSubmittedInput) => Promise<SellerKycRecord>>();
}

class DocumentStorageDouble implements DocumentStorage {
  uploadSellerKycDocument = jest
    .fn<(input: StorageUploadInput) => Promise<UploadedDocument>>()
    .mockResolvedValue({
      storagePath: "seller-kyc/seller-id/id_document/id-card.jpg"
    });
}

describe("UploadSellerKycDocument", () => {
  it("uploads and saves an allowed individual seller document", async () => {
    const sellerKycRepository = new SellerKycRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const uploadSellerKycDocument = new UploadSellerKycDocument(
      sellerKycRepository,
      documentStorage
    );

    const result = await uploadSellerKycDocument.execute({
      userId: "seller-id",
      documentType: "id_document",
      fileName: "id-card.jpg",
      mimeType: "image/jpeg",
      fileContents: Buffer.from("fake")
    });

    expect(documentStorage.uploadSellerKycDocument).toHaveBeenCalled();
    expect(sellerKycRepository.upsertDocument).toHaveBeenCalledWith({
      userId: "seller-id",
      documentType: "id_document",
      storagePath: "seller-kyc/seller-id/id_document/id-card.jpg",
      mimeType: "image/jpeg",
      originalFileName: "id-card.jpg"
    });
    expect(result.documentType).toBe("id_document");
  });

  it("throws when the document type is not allowed for the seller type", async () => {
    const sellerKycRepository = new SellerKycRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const uploadSellerKycDocument = new UploadSellerKycDocument(
      sellerKycRepository,
      documentStorage
    );

    await expect(
      uploadSellerKycDocument.execute({
        userId: "seller-id",
        documentType: "cac_certificate",
        fileName: "cac.pdf",
        mimeType: "application/pdf",
        fileContents: Buffer.from("fake")
      })
    ).rejects.toMatchObject({
      name: "SellerKycError",
      message: "Document type is not allowed for this seller account type.",
      statusCode: 400
    });
    expect(documentStorage.uploadSellerKycDocument).not.toHaveBeenCalled();
  });

  it("returns a SellerKycError instance for unsupported mime types", async () => {
    const sellerKycRepository = new SellerKycRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const uploadSellerKycDocument = new UploadSellerKycDocument(
      sellerKycRepository,
      documentStorage
    );

    await expect(
      uploadSellerKycDocument.execute({
        userId: "seller-id",
        documentType: "id_document",
        fileName: "id-card.gif",
        mimeType: "image/gif",
        fileContents: Buffer.from("fake")
      })
    ).rejects.toBeInstanceOf(SellerKycError);
  });
});
