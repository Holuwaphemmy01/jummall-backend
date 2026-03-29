import { describe, expect, it, jest } from "@jest/globals";

import {
  GetUserProfile,
  GetUserProfileError
} from "../../../src/application/user/get-user-profile";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
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
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
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
      submittedAt: new Date("2026-03-28T00:00:00.000Z"),
      reviewedAt: new Date("2026-03-29T00:00:00.000Z"),
      reviewNote: null,
      documents: [],
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
    });

  saveDraft = jest
    .fn<(input: SaveSellerKycDraftInput) => Promise<SellerKycRecord>>();

  upsertDocument = jest
    .fn<(input: UpsertSellerKycDocumentInput) => Promise<SellerKycDocumentRecord>>();

  markAsSubmitted = jest
    .fn<(input: MarkSellerKycAsSubmittedInput) => Promise<SellerKycRecord>>();
}

describe("GetUserProfile", () => {
  it("returns seller profile with account type and kyc status", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const sellerKycRepository = new SellerKycRepositoryDouble();
    const getUserProfile = new GetUserProfile(
      authenticationRepository,
      sellerKycRepository
    );

    const result = await getUserProfile.execute({
      userId: "seller-id"
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("seller-id");
    expect(sellerKycRepository.findByUserId).toHaveBeenCalledWith("seller-id");
    expect(result).toMatchObject({
      id: "seller-id",
      role: "seller",
      accountType: "individual",
      kycStatus: "approved"
    });
  });

  it("returns buyer profile without seller-only fields", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      ...makeBuyer()
    });
    const sellerKycRepository = new SellerKycRepositoryDouble();
    const getUserProfile = new GetUserProfile(
      authenticationRepository,
      sellerKycRepository
    );

    const result = await getUserProfile.execute({
      userId: "buyer-id"
    });

    expect(sellerKycRepository.findByUserId).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: "buyer-id",
      role: "buyer",
      accountType: null,
      kycStatus: null
    });
  });

  it("throws when the authenticated user is an admin", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      ...makeBuyer(),
      id: "admin-id",
      role: "admin"
    });
    const getUserProfile = new GetUserProfile(
      authenticationRepository,
      new SellerKycRepositoryDouble()
    );

    await expect(
      getUserProfile.execute({
        userId: "admin-id"
      })
    ).rejects.toBeInstanceOf(GetUserProfileError);
  });
});

function makeBuyer(): AuthUser {
  return {
    id: "buyer-id",
    firstName: "John",
    lastName: "Doe",
    username: "john.doe",
    email: "john@example.com",
    phone: "+2348012345678",
    passwordHash: "hashed-password",
    role: "buyer",
    accountStatus: "verified",
    createdAt: new Date("2026-03-29T00:00:00.000Z"),
    updatedAt: new Date("2026-03-29T00:00:00.000Z")
  };
}
