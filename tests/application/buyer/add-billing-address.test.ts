import { describe, expect, it, jest } from "@jest/globals";

import {
  AddBillingAddress,
  AddBillingAddressError
} from "../../../src/application/buyer/add-billing-address";
import type {
  AuthUser,
  AuthenticationRepository
} from "../../../src/ports/authentication-repository";
import type {
  BillingAddressRecord,
  BillingAddressRepository,
  CreateBillingAddressInput,
  UpdateBillingAddressInput
} from "../../../src/ports/billing-address-repository";

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
    createdAt: new Date("2026-03-30T00:00:00.000Z"),
    updatedAt: new Date("2026-03-30T00:00:00.000Z")
  };
}

function makeBillingAddress(
  overrides: Partial<BillingAddressRecord> = {}
): BillingAddressRecord {
  return {
    id: "billing-address-id",
    buyerId: "buyer-id",
    fullName: "John Doe",
    phoneNumber: "+2348012345678",
    addressLine1: "12 Allen Avenue",
    addressLine2: "2nd Floor",
    city: "Ikeja",
    state: "Lagos",
    country: "Nigeria",
    postalCode: "100271",
    createdAt: new Date("2026-03-30T00:00:00.000Z"),
    updatedAt: new Date("2026-03-30T00:00:00.000Z"),
    ...overrides
  };
}

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  findByEmail = jest
    .fn<(email: string) => Promise<AuthUser | null>>()
    .mockResolvedValue(null);

  findById = jest
    .fn<(userId: string) => Promise<AuthUser | null>>()
    .mockResolvedValue(makeBuyer());

  updatePassword = jest
    .fn<(input: { userId: string; passwordHash: string }) => Promise<void>>()
    .mockResolvedValue();
}

class BillingAddressRepositoryDouble implements BillingAddressRepository {
  create = jest
    .fn<(input: CreateBillingAddressInput) => Promise<BillingAddressRecord>>()
    .mockImplementation(async (input) =>
      makeBillingAddress({
        buyerId: input.buyerId,
        fullName: input.fullName,
        phoneNumber: input.phoneNumber,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        city: input.city,
        state: input.state,
        country: input.country,
        postalCode: input.postalCode ?? null
      })
    );

  findByBuyerId = jest
    .fn<(buyerId: string) => Promise<BillingAddressRecord[]>>()
    .mockResolvedValue([makeBillingAddress()]);

  findByIdAndBuyerId = jest
    .fn<
      (billingAddressId: string, buyerId: string) => Promise<BillingAddressRecord | null>
    >()
    .mockResolvedValue(makeBillingAddress());

  deleteByIdAndBuyerId = jest
    .fn<
      (billingAddressId: string, buyerId: string) => Promise<BillingAddressRecord | null>
    >()
    .mockResolvedValue(makeBillingAddress());

  update = jest
    .fn<(input: UpdateBillingAddressInput) => Promise<BillingAddressRecord | null>>()
    .mockResolvedValue(makeBillingAddress());
}

describe("AddBillingAddress", () => {
  it("adds a billing address for a buyer", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const billingAddressRepository = new BillingAddressRepositoryDouble();
    const addBillingAddress = new AddBillingAddress(
      authenticationRepository,
      billingAddressRepository
    );

    const result = await addBillingAddress.execute({
      buyerId: "buyer-id",
      fullName: "John Doe",
      phoneNumber: "+2348012345678",
      addressLine1: "12 Allen Avenue",
      addressLine2: "2nd Floor",
      city: "Ikeja",
      state: "Lagos",
      country: "Nigeria",
      postalCode: "100271"
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("buyer-id");
    expect(billingAddressRepository.create).toHaveBeenCalledWith({
      buyerId: "buyer-id",
      fullName: "John Doe",
      phoneNumber: "+2348012345678",
      addressLine1: "12 Allen Avenue",
      addressLine2: "2nd Floor",
      city: "Ikeja",
      state: "Lagos",
      country: "Nigeria",
      postalCode: "100271"
    });
    expect(result.id).toBe("billing-address-id");
  });

  it("trims address fields before saving", async () => {
    const billingAddressRepository = new BillingAddressRepositoryDouble();
    const addBillingAddress = new AddBillingAddress(
      new AuthenticationRepositoryDouble(),
      billingAddressRepository
    );

    await addBillingAddress.execute({
      buyerId: "buyer-id",
      fullName: " John Doe ",
      phoneNumber: " +2348012345678 ",
      addressLine1: " 12 Allen Avenue ",
      addressLine2: " 2nd Floor ",
      city: " Ikeja ",
      state: " Lagos ",
      country: " Nigeria ",
      postalCode: " 100271 "
    });

    expect(billingAddressRepository.create).toHaveBeenCalledWith({
      buyerId: "buyer-id",
      fullName: "John Doe",
      phoneNumber: "+2348012345678",
      addressLine1: "12 Allen Avenue",
      addressLine2: "2nd Floor",
      city: "Ikeja",
      state: "Lagos",
      country: "Nigeria",
      postalCode: "100271"
    });
  });

  it("throws when the buyer account does not exist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue(null);
    const addBillingAddress = new AddBillingAddress(
      authenticationRepository,
      new BillingAddressRepositoryDouble()
    );

    await expect(
      addBillingAddress.execute({
        buyerId: "missing-buyer-id",
        fullName: "John Doe",
        phoneNumber: "+2348012345678",
        addressLine1: "12 Allen Avenue",
        city: "Ikeja",
        state: "Lagos",
        country: "Nigeria"
      })
    ).rejects.toBeInstanceOf(AddBillingAddressError);
  });

  it("throws when the authenticated user is not a buyer", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      ...makeBuyer(),
      role: "seller"
    });
    const addBillingAddress = new AddBillingAddress(
      authenticationRepository,
      new BillingAddressRepositoryDouble()
    );

    await expect(
      addBillingAddress.execute({
        buyerId: "seller-id",
        fullName: "John Doe",
        phoneNumber: "+2348012345678",
        addressLine1: "12 Allen Avenue",
        city: "Ikeja",
        state: "Lagos",
        country: "Nigeria"
      })
    ).rejects.toBeInstanceOf(AddBillingAddressError);
  });
});
