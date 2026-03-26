import { describe, expect, it, jest } from "@jest/globals";

import {
  SaveSellerKycDraft,
  type SaveSellerKycDraftInput
} from "../../../src/application/seller-kyc/save-seller-kyc-draft";
import { SellerKycError } from "../../../src/application/seller-kyc/seller-kyc-errors";
import type {
  MarkSellerKycAsSubmittedInput,
  SaveSellerKycDraftInput as RepositorySaveSellerKycDraftInput,
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
    status: "not_started",
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

  saveDraft = jest
    .fn<(input: RepositorySaveSellerKycDraftInput) => Promise<SellerKycRecord>>()
    .mockImplementation(async (input) =>
      makeKycRecord({
        status: "in_progress",
        email: input.email ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        country: input.country ?? "Nigeria",
        bankName: input.bankName ?? null,
        bankAccountNumber: input.bankAccountNumber ?? null,
        bankAccountName: input.bankAccountName ?? null,
        fullName: input.fullName ?? null,
        dateOfBirth: input.dateOfBirth ?? null,
        idType: input.idType ?? null,
        idNumber: input.idNumber ?? null
      })
    );

  upsertDocument = jest
    .fn<(input: UpsertSellerKycDocumentInput) => Promise<SellerKycDocumentRecord>>();

  markAsSubmitted = jest
    .fn<
      (input: MarkSellerKycAsSubmittedInput) => Promise<SellerKycRecord>
    >();
}

function makeInput(): SaveSellerKycDraftInput {
  return {
    userId: "seller-id",
    accountType: "individual",
    email: "seller@example.com",
    phone: "08012345678",
    address: "12 Allen Avenue",
    city: "Ikeja",
    state: "Lagos",
    bankName: "Access Bank",
    bankAccountNumber: "0123456789",
    bankAccountName: "John Doe",
    fullName: "John Doe",
    dateOfBirth: new Date("1995-06-12T00:00:00.000Z"),
    idType: "national_id",
    idNumber: "1234567890"
  };
}

describe("SaveSellerKycDraft", () => {
  it("saves a seller KYC draft and defaults country to Nigeria", async () => {
    const sellerKycRepository = new SellerKycRepositoryDouble();
    const saveSellerKycDraft = new SaveSellerKycDraft(sellerKycRepository);

    const result = await saveSellerKycDraft.execute(makeInput());

    expect(sellerKycRepository.findByUserId).toHaveBeenCalledWith("seller-id");
    expect(sellerKycRepository.saveDraft).toHaveBeenCalledWith({
      ...makeInput(),
      country: "Nigeria"
    });
    expect(result.status).toBe("in_progress");
    expect(result.country).toBe("Nigeria");
  });

  it("throws when account type does not match the seller profile", async () => {
    const sellerKycRepository = new SellerKycRepositoryDouble();
    sellerKycRepository.findByUserId.mockResolvedValue(
      makeKycRecord({ accountType: "business" })
    );
    const saveSellerKycDraft = new SaveSellerKycDraft(sellerKycRepository);

    await expect(saveSellerKycDraft.execute(makeInput())).rejects.toMatchObject({
      name: "SellerKycError",
      message: "Account type does not match seller profile.",
      statusCode: 409
    });
    expect(sellerKycRepository.saveDraft).not.toHaveBeenCalled();
  });

  it("throws when the bank account number is not a valid NUBAN", async () => {
    const sellerKycRepository = new SellerKycRepositoryDouble();
    const saveSellerKycDraft = new SaveSellerKycDraft(sellerKycRepository);

    await expect(
      saveSellerKycDraft.execute({
        ...makeInput(),
        bankAccountNumber: "12345"
      })
    ).rejects.toMatchObject({
      name: "SellerKycError",
      message: "Bank account number must be a valid NUBAN.",
      statusCode: 400
    });
    expect(sellerKycRepository.saveDraft).not.toHaveBeenCalled();
  });

  it("returns a SellerKycError instance for immutable statuses", async () => {
    const sellerKycRepository = new SellerKycRepositoryDouble();
    sellerKycRepository.findByUserId.mockResolvedValue(
      makeKycRecord({ status: "submitted" })
    );
    const saveSellerKycDraft = new SaveSellerKycDraft(sellerKycRepository);

    await expect(saveSellerKycDraft.execute(makeInput())).rejects.toBeInstanceOf(
      SellerKycError
    );
  });
});
