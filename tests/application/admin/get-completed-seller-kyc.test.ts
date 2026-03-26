import { describe, expect, it, jest } from "@jest/globals";

import {
  GetCompletedSellerKyc,
  GetCompletedSellerKycError
} from "../../../src/application/admin/get-completed-seller-kyc";
import type {
  AdminKycRepository,
  AdminSellerKycDetail,
  AdminSellerKycSummary
} from "../../../src/ports/admin-kyc-repository";

class AdminKycRepositoryDouble implements AdminKycRepository {
  listCompletedSellerKyc = jest
    .fn<() => Promise<AdminSellerKycSummary[]>>()
    .mockResolvedValue([]);

  findCompletedSellerKycById = jest
    .fn<(kycId: string) => Promise<AdminSellerKycDetail | null>>()
    .mockResolvedValue({
      id: "kyc-id",
      userId: "seller-id",
      sellerFirstName: "Jane",
      sellerLastName: "Doe",
      sellerUsername: "jane.doe",
      sellerEmail: "jane@example.com",
      sellerPhone: "+2348012345678",
      accountType: "business",
      status: "submitted",
      submittedAt: new Date("2026-03-26T12:00:00.000Z"),
      reviewedAt: null,
      createdAt: new Date("2026-03-25T12:00:00.000Z"),
      updatedAt: new Date("2026-03-26T12:00:00.000Z"),
      email: "seller@example.com",
      phone: "08012345678",
      address: "15 Broad Street",
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
      bankName: "GTBank",
      bankAccountNumber: "0123456789",
      bankAccountName: "ABC Ventures Ltd",
      fullName: null,
      dateOfBirth: null,
      gender: null,
      idType: null,
      idNumber: null,
      businessName: "ABC Ventures Ltd",
      registrationNumber: "RC1234567",
      registeredBusinessAddress: "15 Broad Street, Lagos",
      representativeFirstName: "Ada",
      representativeLastName: "Okafor",
      representativeRole: "Director",
      reviewNote: null,
      documents: []
    });

  approveSellerKyc = jest
    .fn<
      (input: {
        kycId: string;
        reviewNote?: string;
        reviewedAt: Date;
      }) => Promise<AdminSellerKycDetail | null>
    >()
    .mockResolvedValue(null);
}

describe("GetCompletedSellerKyc", () => {
  it("returns a completed seller KYC submission by id", async () => {
    const adminKycRepository = new AdminKycRepositoryDouble();
    const getCompletedSellerKyc = new GetCompletedSellerKyc(adminKycRepository);

    const result = await getCompletedSellerKyc.execute({
      kycId: "kyc-id"
    });

    expect(adminKycRepository.findCompletedSellerKycById).toHaveBeenCalledWith(
      "kyc-id"
    );
    expect(result).toMatchObject({
      id: "kyc-id",
      businessName: "ABC Ventures Ltd",
      status: "submitted"
    });
  });

  it("throws when the seller KYC submission does not exist", async () => {
    const adminKycRepository = new AdminKycRepositoryDouble();
    adminKycRepository.findCompletedSellerKycById.mockResolvedValue(null);
    const getCompletedSellerKyc = new GetCompletedSellerKyc(adminKycRepository);

    await expect(
      getCompletedSellerKyc.execute({
        kycId: "missing-id"
      })
    ).rejects.toBeInstanceOf(GetCompletedSellerKycError);
  });
});
