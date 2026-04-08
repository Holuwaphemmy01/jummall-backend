import { describe, expect, it, jest } from "@jest/globals";

import {
  UpdateBillingAddress,
  UpdateBillingAddressError
} from "../../../src/application/buyer/update-billing-address";
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
    createdAt: new Date("2026-04-08T00:00:00.000Z"),
    updatedAt: new Date("2026-04-08T00:00:00.000Z")
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
    createdAt: new Date("2026-04-08T00:00:00.000Z"),
    updatedAt: new Date("2026-04-08T00:00:00.000Z"),
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
    .mockImplementation(async (input) =>
      makeBillingAddress({
        id: input.billingAddressId,
        buyerId: input.buyerId,
        fullName: input.fullName ?? "John Doe",
        phoneNumber: input.phoneNumber ?? "+2348012345678",
        addressLine1: input.addressLine1 ?? "12 Allen Avenue",
        addressLine2:
          input.addressLine2 === undefined ? "2nd Floor" : input.addressLine2,
        city: input.city ?? "Ikeja",
        state: input.state ?? "Lagos",
        country: input.country ?? "Nigeria",
        postalCode:
          input.postalCode === undefined ? "100271" : input.postalCode,
        updatedAt: new Date("2026-04-08T12:00:00.000Z")
      })
    );
}

describe("UpdateBillingAddress", () => {
  it("updates a buyer billing address", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const billingAddressRepository = new BillingAddressRepositoryDouble();
    const updateBillingAddress = new UpdateBillingAddress(
      authenticationRepository,
      billingAddressRepository
    );

    const result = await updateBillingAddress.execute({
      buyerId: "buyer-id",
      billingAddressId: "billing-address-id",
      city: "Abuja",
      state: "FCT"
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("buyer-id");
    expect(billingAddressRepository.findByIdAndBuyerId).toHaveBeenCalledWith(
      "billing-address-id",
      "buyer-id"
    );
    expect(billingAddressRepository.update).toHaveBeenCalledWith({
      billingAddressId: "billing-address-id",
      buyerId: "buyer-id",
      city: "Abuja",
      state: "FCT"
    });
    expect(result.city).toBe("Abuja");
    expect(result.state).toBe("FCT");
  });

  it("trims provided fields and allows clearing nullable fields", async () => {
    const billingAddressRepository = new BillingAddressRepositoryDouble();
    const updateBillingAddress = new UpdateBillingAddress(
      new AuthenticationRepositoryDouble(),
      billingAddressRepository
    );

    await updateBillingAddress.execute({
      buyerId: "buyer-id",
      billingAddressId: "billing-address-id",
      fullName: " John Doe ",
      phoneNumber: " +2348012345678 ",
      addressLine1: " 12 Allen Avenue ",
      addressLine2: null,
      city: " Ikeja ",
      state: " Lagos ",
      country: " Nigeria ",
      postalCode: null
    });

    expect(billingAddressRepository.update).toHaveBeenCalledWith({
      billingAddressId: "billing-address-id",
      buyerId: "buyer-id",
      fullName: "John Doe",
      phoneNumber: "+2348012345678",
      addressLine1: "12 Allen Avenue",
      addressLine2: null,
      city: "Ikeja",
      state: "Lagos",
      country: "Nigeria",
      postalCode: null
    });
  });

  it("throws when the buyer account does not exist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue(null);
    const updateBillingAddress = new UpdateBillingAddress(
      authenticationRepository,
      new BillingAddressRepositoryDouble()
    );

    await expect(
      updateBillingAddress.execute({
        buyerId: "missing-buyer-id",
        billingAddressId: "billing-address-id",
        city: "Ikeja"
      })
    ).rejects.toBeInstanceOf(UpdateBillingAddressError);
  });

  it("throws when the authenticated user is not a buyer", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      ...makeBuyer(),
      role: "seller"
    });
    const updateBillingAddress = new UpdateBillingAddress(
      authenticationRepository,
      new BillingAddressRepositoryDouble()
    );

    await expect(
      updateBillingAddress.execute({
        buyerId: "seller-id",
        billingAddressId: "billing-address-id",
        city: "Ikeja"
      })
    ).rejects.toBeInstanceOf(UpdateBillingAddressError);
  });

  it("throws when the billing address does not exist for the buyer", async () => {
    const billingAddressRepository = new BillingAddressRepositoryDouble();
    billingAddressRepository.findByIdAndBuyerId.mockResolvedValue(null);
    const updateBillingAddress = new UpdateBillingAddress(
      new AuthenticationRepositoryDouble(),
      billingAddressRepository
    );

    await expect(
      updateBillingAddress.execute({
        buyerId: "buyer-id",
        billingAddressId: "missing-billing-address-id",
        city: "Ikeja"
      })
    ).rejects.toBeInstanceOf(UpdateBillingAddressError);
    expect(billingAddressRepository.update).not.toHaveBeenCalled();
  });

  it("throws when the update unexpectedly fails", async () => {
    const billingAddressRepository = new BillingAddressRepositoryDouble();
    billingAddressRepository.update.mockResolvedValue(null);
    const updateBillingAddress = new UpdateBillingAddress(
      new AuthenticationRepositoryDouble(),
      billingAddressRepository
    );

    await expect(
      updateBillingAddress.execute({
        buyerId: "buyer-id",
        billingAddressId: "billing-address-id",
        city: "Ikeja"
      })
    ).rejects.toBeInstanceOf(UpdateBillingAddressError);
  });
});
