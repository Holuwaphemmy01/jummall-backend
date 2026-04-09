import { describe, expect, it, jest } from "@jest/globals";

import {
  UpdateBuyerProfile,
  UpdateBuyerProfileError
} from "../../../src/application/buyer/update-buyer-profile";
import type {
  AuthUser,
  AuthenticationRepository
} from "../../../src/ports/authentication-repository";
import type {
  BuyerRecord,
  BuyerRepository,
  CreateBuyerInput,
  ExistingBuyerIdentifiers,
  FindExistingBuyerIdentifiersInput,
  FindExistingBuyerPhoneByAnotherUserInput,
  UpdateBuyerProfileInput
} from "../../../src/ports/buyer-repository";

function makeBuyerAuthUser(): AuthUser {
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
    createdAt: new Date("2026-04-08T00:00:00.000Z"),
    updatedAt: new Date("2026-04-08T00:00:00.000Z")
  };
}

function makeBuyerRecord(
  overrides: Partial<BuyerRecord> = {}
): BuyerRecord {
  return {
    id: "buyer-id",
    firstName: "John",
    lastName: "Doe",
    username: "john.doe",
    email: "john@example.com",
    phone: "+2348012345678",
    role: "buyer",
    accountStatus: "verified",
    createdAt: new Date("2026-04-08T00:00:00.000Z"),
    updatedAt: new Date("2026-04-08T12:00:00.000Z"),
    ...overrides
  };
}

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  findByEmail = jest
    .fn<(email: string) => Promise<AuthUser | null>>()
    .mockResolvedValue(null);

  findById = jest
    .fn<(userId: string) => Promise<AuthUser | null>>()
    .mockResolvedValue(makeBuyerAuthUser());

  updatePassword = jest
    .fn<(input: { userId: string; passwordHash: string }) => Promise<void>>()
    .mockResolvedValue();
}

class BuyerRepositoryDouble implements BuyerRepository {
  findExistingIdentifiers = jest
    .fn<(input: FindExistingBuyerIdentifiersInput) => Promise<ExistingBuyerIdentifiers>>()
    .mockResolvedValue({
      email: false,
      username: false,
      phone: false
    });

  isPhoneInUseByAnotherUser = jest
    .fn<
      (input: FindExistingBuyerPhoneByAnotherUserInput) => Promise<boolean>
    >()
    .mockResolvedValue(false);

  createBuyer = jest
    .fn<(input: CreateBuyerInput) => Promise<BuyerRecord>>()
    .mockResolvedValue(makeBuyerRecord());

  updateBuyerProfile = jest
    .fn<(input: UpdateBuyerProfileInput) => Promise<BuyerRecord | null>>()
    .mockImplementation(async (input) =>
      makeBuyerRecord({
        firstName: input.firstName ?? "John",
        lastName: input.lastName ?? "Doe",
        phone: input.phone ?? "+2348012345678"
      })
    );
}

describe("UpdateBuyerProfile", () => {
  it("updates buyer profile fields", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const buyerRepository = new BuyerRepositoryDouble();
    const updateBuyerProfile = new UpdateBuyerProfile(
      authenticationRepository,
      buyerRepository
    );

    const result = await updateBuyerProfile.execute({
      buyerId: "buyer-id",
      firstName: "Jane",
      lastName: "Smith"
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("buyer-id");
    expect(buyerRepository.isPhoneInUseByAnotherUser).not.toHaveBeenCalled();
    expect(buyerRepository.updateBuyerProfile).toHaveBeenCalledWith({
      buyerId: "buyer-id",
      firstName: "Jane",
      lastName: "Smith"
    });
    expect(result.firstName).toBe("Jane");
    expect(result.lastName).toBe("Smith");
  });

  it("trims provided fields before saving", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const updateBuyerProfile = new UpdateBuyerProfile(
      new AuthenticationRepositoryDouble(),
      buyerRepository
    );

    await updateBuyerProfile.execute({
      buyerId: "buyer-id",
      firstName: " Jane ",
      lastName: " Smith ",
      phone: " +2348099999999 "
    });

    expect(buyerRepository.isPhoneInUseByAnotherUser).toHaveBeenCalledWith({
      buyerId: "buyer-id",
      phone: "+2348099999999"
    });
    expect(buyerRepository.updateBuyerProfile).toHaveBeenCalledWith({
      buyerId: "buyer-id",
      firstName: "Jane",
      lastName: "Smith",
      phone: "+2348099999999"
    });
  });

  it("does not check phone uniqueness when phone is unchanged", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const updateBuyerProfile = new UpdateBuyerProfile(
      new AuthenticationRepositoryDouble(),
      buyerRepository
    );

    await updateBuyerProfile.execute({
      buyerId: "buyer-id",
      phone: "+2348012345678"
    });

    expect(buyerRepository.isPhoneInUseByAnotherUser).not.toHaveBeenCalled();
  });

  it("throws when the buyer account does not exist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue(null);
    const updateBuyerProfile = new UpdateBuyerProfile(
      authenticationRepository,
      new BuyerRepositoryDouble()
    );

    await expect(
      updateBuyerProfile.execute({
        buyerId: "missing-buyer-id",
        firstName: "Jane"
      })
    ).rejects.toBeInstanceOf(UpdateBuyerProfileError);
  });

  it("throws when the authenticated user is not a buyer", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      ...makeBuyerAuthUser(),
      role: "seller"
    });
    const updateBuyerProfile = new UpdateBuyerProfile(
      authenticationRepository,
      new BuyerRepositoryDouble()
    );

    await expect(
      updateBuyerProfile.execute({
        buyerId: "seller-id",
        firstName: "Jane"
      })
    ).rejects.toBeInstanceOf(UpdateBuyerProfileError);
  });

  it("throws when phone is already in use", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    buyerRepository.isPhoneInUseByAnotherUser.mockResolvedValue(true);
    const updateBuyerProfile = new UpdateBuyerProfile(
      new AuthenticationRepositoryDouble(),
      buyerRepository
    );

    await expect(
      updateBuyerProfile.execute({
        buyerId: "buyer-id",
        phone: "+2348099999999"
      })
    ).rejects.toMatchObject({
      message: "Phone is already in use.",
      statusCode: 409,
      field: "phone"
    });
    expect(buyerRepository.updateBuyerProfile).not.toHaveBeenCalled();
  });

  it("throws when the repository update fails unexpectedly", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    buyerRepository.updateBuyerProfile.mockResolvedValue(null);
    const updateBuyerProfile = new UpdateBuyerProfile(
      new AuthenticationRepositoryDouble(),
      buyerRepository
    );

    await expect(
      updateBuyerProfile.execute({
        buyerId: "buyer-id",
        firstName: "Jane"
      })
    ).rejects.toBeInstanceOf(UpdateBuyerProfileError);
  });
});
