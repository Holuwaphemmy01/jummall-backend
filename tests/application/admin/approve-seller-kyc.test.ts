import { describe, expect, it, jest } from "@jest/globals";

import {
  ApproveSellerKyc,
  ApproveSellerKycError
} from "../../../src/application/admin/approve-seller-kyc";
import type {
  AdminKycRepository,
  AdminSellerKycDetail,
  AdminSellerKycSummary
} from "../../../src/ports/admin-kyc-repository";

function makeSubmission(
  overrides: Partial<AdminSellerKycDetail> = {}
): AdminSellerKycDetail {
  return {
    id: "kyc-id",
    userId: "seller-id",
    sellerFirstName: "Jane",
    sellerLastName: "Doe",
    sellerUsername: "jane.doe",
    sellerEmail: "jane@example.com",
    sellerPhone: "+2348012345678",
    accountType: "individual",
    status: "submitted",
    submittedAt: new Date("2026-03-26T12:00:00.000Z"),
    reviewedAt: null,
    createdAt: new Date("2026-03-25T12:00:00.000Z"),
    updatedAt: new Date("2026-03-26T12:00:00.000Z"),
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
    dateOfBirth: new Date("1996-03-20T00:00:00.000Z"),
    gender: null,
    idType: "national_id",
    idNumber: "1234567890",
    businessName: null,
    registrationNumber: null,
    registeredBusinessAddress: null,
    representativeFirstName: null,
    representativeLastName: null,
    representativeRole: null,
    reviewNote: null,
    documents: [],
    ...overrides
  };
}

class AdminKycRepositoryDouble implements AdminKycRepository {
  listCompletedSellerKyc = jest
    .fn<() => Promise<AdminSellerKycSummary[]>>()
    .mockResolvedValue([]);

  findCompletedSellerKycById = jest
    .fn<(kycId: string) => Promise<AdminSellerKycDetail | null>>()
    .mockResolvedValue(makeSubmission());

  approveSellerKyc = jest
    .fn<
      (input: {
        kycId: string;
        reviewNote?: string;
        reviewedAt: Date;
      }) => Promise<AdminSellerKycDetail | null>
    >()
    .mockImplementation(async (input) =>
      makeSubmission({
        status: "approved",
        reviewedAt: input.reviewedAt,
        reviewNote: input.reviewNote ?? null
      })
    );
}

describe("ApproveSellerKyc", () => {
  it("approves a submitted seller KYC submission", async () => {
    const adminKycRepository = new AdminKycRepositoryDouble();
    const approveSellerKyc = new ApproveSellerKyc(adminKycRepository);

    const result = await approveSellerKyc.execute({
      kycId: "kyc-id",
      reviewNote: "Looks good."
    });

    expect(adminKycRepository.findCompletedSellerKycById).toHaveBeenCalledWith(
      "kyc-id"
    );
    expect(adminKycRepository.approveSellerKyc).toHaveBeenCalledWith({
      kycId: "kyc-id",
      reviewNote: "Looks good.",
      reviewedAt: expect.any(Date)
    });
    expect(result.status).toBe("approved");
  });

  it("throws when the seller KYC cannot be approved in its current state", async () => {
    const adminKycRepository = new AdminKycRepositoryDouble();
    adminKycRepository.findCompletedSellerKycById.mockResolvedValue(
      makeSubmission({ status: "approved" })
    );
    const approveSellerKyc = new ApproveSellerKyc(adminKycRepository);

    await expect(
      approveSellerKyc.execute({
        kycId: "kyc-id"
      })
    ).rejects.toBeInstanceOf(ApproveSellerKycError);
    expect(adminKycRepository.approveSellerKyc).not.toHaveBeenCalled();
  });
});
