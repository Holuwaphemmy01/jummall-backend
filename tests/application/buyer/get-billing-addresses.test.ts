import { describe, expect, it, jest } from "@jest/globals";

import {
  GetBillingAddresses,
  GetBillingAddressesError
} from "../../../src/application/buyer/get-billing-addresses";
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
    createdAt: new Date("2026-03-31T00:00:00.000Z"),
    updatedAt: new Date("2026-03-31T00:00:00.000Z")
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
    createdAt: new Date("2026-03-31T00:00:00.000Z"),
    updatedAt: new Date("2026-03-31T00:00:00.000Z"),
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
    .mockResolvedValue(makeBillingAddress());

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

describe("GetBillingAddresses", () => {
  it("returns billing addresses for a buyer", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const billingAddressRepository = new BillingAddressRepositoryDouble();
    const getBillingAddresses = new GetBillingAddresses(
      authenticationRepository,
      billingAddressRepository
    );

    const result = await getBillingAddresses.execute({
      buyerId: "buyer-id"
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("buyer-id");
    expect(billingAddressRepository.findByBuyerId).toHaveBeenCalledWith(
      "buyer-id"
    );
    expect(result.addresses).toHaveLength(1);
    expect(result.addresses[0]).toMatchObject({
      id: "billing-address-id",
      fullName: "John Doe",
      city: "Ikeja",
      state: "Lagos"
    });
  });

  it("returns an empty list when the buyer has no billing addresses", async () => {
    const billingAddressRepository = new BillingAddressRepositoryDouble();
    billingAddressRepository.findByBuyerId.mockResolvedValue([]);
    const getBillingAddresses = new GetBillingAddresses(
      new AuthenticationRepositoryDouble(),
      billingAddressRepository
    );

    const result = await getBillingAddresses.execute({
      buyerId: "buyer-id"
    });

    expect(result).toEqual({
      addresses: []
    });
  });

  it("throws when the buyer account does not exist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue(null);
    const getBillingAddresses = new GetBillingAddresses(
      authenticationRepository,
      new BillingAddressRepositoryDouble()
    );

    await expect(
      getBillingAddresses.execute({
        buyerId: "missing-buyer-id"
      })
    ).rejects.toBeInstanceOf(GetBillingAddressesError);
  });

  it("throws when the authenticated user is not a buyer", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      ...makeBuyer(),
      role: "seller"
    });
    const getBillingAddresses = new GetBillingAddresses(
      authenticationRepository,
      new BillingAddressRepositoryDouble()
    );

    await expect(
      getBillingAddresses.execute({
        buyerId: "seller-id"
      })
    ).rejects.toBeInstanceOf(GetBillingAddressesError);
  });
});
