import { describe, expect, it, jest } from "@jest/globals";

import { SellerKycError } from "../../../src/application/seller-kyc/seller-kyc-errors";
import { SubmitSellerKyc } from "../../../src/application/seller-kyc/submit-seller-kyc";
import type {
  MarkSellerKycAsSubmittedInput,
  SaveSellerKycDraftInput,
  SellerKycDocumentRecord,
  SellerKycRecord,
  SellerKycRepository,
  UpsertSellerKycDocumentInput
} from "../../../src/ports/seller-kyc-repository";

function makeDocument(
  documentType: SellerKycDocumentRecord["documentType"]
): SellerKycDocumentRecord {
  return {
    id: `${documentType}-id`,
    documentType,
    storagePath: `seller-kyc/seller-id/${documentType}/file.jpg`,
    mimeType: "image/jpeg",
    originalFileName: "file.jpg",
    createdAt: new Date("2026-03-26T00:00:00.000Z"),
    updatedAt: new Date("2026-03-26T00:00:00.000Z")
  };
}

function makeKycRecord(
  overrides: Partial<SellerKycRecord> = {}
): SellerKycRecord {
  return {
    id: "kyc-id",
    userId: "seller-id",
    accountType: "individual",
    status: "in_progress",
    email: "seller@example.com",
    phone: "08012345678",
    address: "12 Allen Avenue",
    city: "Ikeja",
    state: "Lagos",
    country: "Nigeria",
    bankName: "Access Bank",
    bankAccountNumber: "0123456789",
    bankAccountName: "John Doe",
    fullName: "John Doe",
    dateOfBirth: new Date("1995-06-12T00:00:00.000Z"),
    gender: null,
    idType: "national_id",
    idNumber: "1234567890",
    businessName: null,
    registrationNumber: null,
    registeredBusinessAddress: null,
    representativeFirstName: null,
    representativeLastName: null,
    representativeRole: null,
    submittedAt: null,
    reviewedAt: null,
    reviewNote: null,
    documents: [
      makeDocument("proof_of_address"),
      makeDocument("id_document"),
      makeDocument("selfie")
    ],
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
    .fn<(input: UpsertSellerKycDocumentInput) => Promise<SellerKycDocumentRecord>>();

  markAsSubmitted = jest
    .fn<
      (input: MarkSellerKycAsSubmittedInput) => Promise<SellerKycRecord>
    >()
    .mockImplementation(async (input) =>
      makeKycRecord({
        status: "submitted",
        submittedAt: input.submittedAt
      })
    );
}

describe("SubmitSellerKyc", () => {
  it("submits a complete seller KYC profile successfully", async () => {
    const sellerKycRepository = new SellerKycRepositoryDouble();
    const submitSellerKyc = new SubmitSellerKyc(sellerKycRepository);

    const result = await submitSellerKyc.execute({
      userId: "seller-id"
    });

    expect(sellerKycRepository.markAsSubmitted).toHaveBeenCalledWith({
      userId: "seller-id",
      submittedAt: expect.any(Date)
    });
    expect(result.status).toBe("submitted");
  });

  it("throws when required fields or documents are missing", async () => {
    const sellerKycRepository = new SellerKycRepositoryDouble();
    sellerKycRepository.findByUserId.mockResolvedValue(
      makeKycRecord({
        bankAccountName: null,
        documents: [makeDocument("proof_of_address")]
      })
    );
    const submitSellerKyc = new SubmitSellerKyc(sellerKycRepository);

    await expect(
      submitSellerKyc.execute({
        userId: "seller-id"
      })
    ).rejects.toMatchObject({
      name: "SellerKycError",
      message: "KYC submission is incomplete.",
      statusCode: 400
    });
    expect(sellerKycRepository.markAsSubmitted).not.toHaveBeenCalled();
  });

  it("returns a SellerKycError instance when the KYC state cannot be submitted", async () => {
    const sellerKycRepository = new SellerKycRepositoryDouble();
    sellerKycRepository.findByUserId.mockResolvedValue(
      makeKycRecord({ status: "submitted" })
    );
    const submitSellerKyc = new SubmitSellerKyc(sellerKycRepository);

    await expect(
      submitSellerKyc.execute({
        userId: "seller-id"
      })
    ).rejects.toBeInstanceOf(SellerKycError);
  });
});
