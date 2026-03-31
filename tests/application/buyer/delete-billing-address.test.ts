import { describe, expect, it, jest } from "@jest/globals";

import {
  DeleteBillingAddress,
  DeleteBillingAddressError
} from "../../../src/application/buyer/delete-billing-address";
import type {
  AuthUser,
  AuthenticationRepository
} from "../../../src/ports/authentication-repository";
import type {
  BillingAddressRecord,
  BillingAddressRepository,
  CreateBillingAddressInput
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
}

describe("DeleteBillingAddress", () => {
  it("deletes a buyer billing address by id", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const billingAddressRepository = new BillingAddressRepositoryDouble();
    const deleteBillingAddress = new DeleteBillingAddress(
      authenticationRepository,
      billingAddressRepository
    );

    const result = await deleteBillingAddress.execute({
      buyerId: "buyer-id",
      billingAddressId: "billing-address-id"
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("buyer-id");
    expect(billingAddressRepository.findByIdAndBuyerId).toHaveBeenCalledWith(
      "billing-address-id",
      "buyer-id"
    );
    expect(billingAddressRepository.deleteByIdAndBuyerId).toHaveBeenCalledWith(
      "billing-address-id",
      "buyer-id"
    );
    expect(result.id).toBe("billing-address-id");
  });

  it("throws when the buyer account does not exist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue(null);
    const deleteBillingAddress = new DeleteBillingAddress(
      authenticationRepository,
      new BillingAddressRepositoryDouble()
    );

    await expect(
      deleteBillingAddress.execute({
        buyerId: "missing-buyer-id",
        billingAddressId: "billing-address-id"
      })
    ).rejects.toBeInstanceOf(DeleteBillingAddressError);
  });

  it("throws when the authenticated user is not a buyer", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      ...makeBuyer(),
      role: "seller"
    });
    const deleteBillingAddress = new DeleteBillingAddress(
      authenticationRepository,
      new BillingAddressRepositoryDouble()
    );

    await expect(
      deleteBillingAddress.execute({
        buyerId: "seller-id",
        billingAddressId: "billing-address-id"
      })
    ).rejects.toBeInstanceOf(DeleteBillingAddressError);
  });

  it("throws when the billing address does not exist for the buyer", async () => {
    const billingAddressRepository = new BillingAddressRepositoryDouble();
    billingAddressRepository.findByIdAndBuyerId.mockResolvedValue(null);
    const deleteBillingAddress = new DeleteBillingAddress(
      new AuthenticationRepositoryDouble(),
      billingAddressRepository
    );

    await expect(
      deleteBillingAddress.execute({
        buyerId: "buyer-id",
        billingAddressId: "missing-billing-address-id"
      })
    ).rejects.toBeInstanceOf(DeleteBillingAddressError);
    expect(billingAddressRepository.deleteByIdAndBuyerId).not.toHaveBeenCalled();
  });

  it("throws when the delete unexpectedly fails", async () => {
    const billingAddressRepository = new BillingAddressRepositoryDouble();
    billingAddressRepository.deleteByIdAndBuyerId.mockResolvedValue(null);
    const deleteBillingAddress = new DeleteBillingAddress(
      new AuthenticationRepositoryDouble(),
      billingAddressRepository
    );

    await expect(
      deleteBillingAddress.execute({
        buyerId: "buyer-id",
        billingAddressId: "billing-address-id"
      })
    ).rejects.toBeInstanceOf(DeleteBillingAddressError);
  });
});
