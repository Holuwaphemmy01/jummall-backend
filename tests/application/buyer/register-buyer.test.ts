import { describe, expect, it, jest } from "@jest/globals";

import {
  RegisterBuyer,
  RegisterBuyerError,
  type RegisterBuyerInput
} from "../../../src/application/buyer/register-buyer";
import type {
  BuyerRecord,
  BuyerRepository,
  CreateBuyerInput,
  ExistingBuyerIdentifiers,
  FindExistingBuyerIdentifiersInput
} from "../../../src/ports/buyer-repository";
import type { PasswordHasher } from "../../../src/ports/password-hasher";

class BuyerRepositoryDouble implements BuyerRepository {
  findExistingIdentifiers = jest
    .fn<(input: FindExistingBuyerIdentifiersInput) => Promise<ExistingBuyerIdentifiers>>()
    .mockResolvedValue({
      email: false,
      username: false,
      phone: false
    });

  createBuyer = jest
    .fn<(input: CreateBuyerInput) => Promise<BuyerRecord>>()
    .mockImplementation(async (input) => ({
      id: "buyer-id",
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
      email: input.email,
      phone: input.phone,
      role: "buyer",
      createdAt: new Date("2026-03-24T00:00:00.000Z"),
      updatedAt: new Date("2026-03-24T00:00:00.000Z")
    }));
}

class PasswordHasherDouble implements PasswordHasher {
  hash = jest
    .fn<(value: string) => Promise<string>>()
    .mockResolvedValue("hashed-password");

  compare = jest
    .fn<(value: string, hash: string) => Promise<boolean>>()
    .mockResolvedValue(true);
}

function makeInput(): RegisterBuyerInput {
  return {
    firstName: "John",
    lastName: "Doe",
    username: "john.doe",
    email: "john@example.com",
    password: "Password123",
    passwordConfirmation: "Password123",
    phone: "+2348012345678"
  };
}

describe("RegisterBuyer", () => {
  it("registers a buyer successfully with valid input", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerBuyer = new RegisterBuyer(buyerRepository, passwordHasher);

    const result = await registerBuyer.execute(makeInput());

    expect(buyerRepository.findExistingIdentifiers).toHaveBeenCalledWith({
      email: "john@example.com",
      username: "john.doe",
      phone: "+2348012345678"
    });
    expect(passwordHasher.hash).toHaveBeenCalledWith("Password123");
    expect(buyerRepository.createBuyer).toHaveBeenCalledWith({
      firstName: "John",
      lastName: "Doe",
      username: "john.doe",
      email: "john@example.com",
      phone: "+2348012345678",
      passwordHash: "hashed-password"
    });
    expect(result).toMatchObject({
      id: "buyer-id",
      firstName: "John",
      lastName: "Doe",
      username: "john.doe",
      email: "john@example.com",
      phone: "+2348012345678",
      role: "buyer"
    });
  });

  it("throws when password confirmation does not match", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerBuyer = new RegisterBuyer(buyerRepository, passwordHasher);
    const input = {
      ...makeInput(),
      passwordConfirmation: "AnotherPassword123"
    };

    await expect(registerBuyer.execute(input)).rejects.toMatchObject({
      name: "RegisterBuyerError",
      message: "Password confirmation does not match password.",
      statusCode: 400,
      field: "password_confirmation"
    });
    expect(buyerRepository.findExistingIdentifiers).not.toHaveBeenCalled();
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(buyerRepository.createBuyer).not.toHaveBeenCalled();
  });

  it("throws when email is already in use", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerBuyer = new RegisterBuyer(buyerRepository, passwordHasher);

    buyerRepository.findExistingIdentifiers.mockResolvedValue({
      email: true,
      username: false,
      phone: false
    });

    await expect(registerBuyer.execute(makeInput())).rejects.toMatchObject({
      name: "RegisterBuyerError",
      message: "Email is already in use.",
      statusCode: 409,
      field: "email"
    });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(buyerRepository.createBuyer).not.toHaveBeenCalled();
  });

  it("throws when username is already in use", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerBuyer = new RegisterBuyer(buyerRepository, passwordHasher);

    buyerRepository.findExistingIdentifiers.mockResolvedValue({
      email: false,
      username: true,
      phone: false
    });

    await expect(registerBuyer.execute(makeInput())).rejects.toMatchObject({
      name: "RegisterBuyerError",
      message: "Username is already in use.",
      statusCode: 409,
      field: "username"
    });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(buyerRepository.createBuyer).not.toHaveBeenCalled();
  });

  it("throws when phone is already in use", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerBuyer = new RegisterBuyer(buyerRepository, passwordHasher);

    buyerRepository.findExistingIdentifiers.mockResolvedValue({
      email: false,
      username: false,
      phone: true
    });

    await expect(registerBuyer.execute(makeInput())).rejects.toMatchObject({
      name: "RegisterBuyerError",
      message: "Phone is already in use.",
      statusCode: 409,
      field: "phone"
    });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(buyerRepository.createBuyer).not.toHaveBeenCalled();
  });

  it("prioritizes email conflict over username and phone conflicts", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerBuyer = new RegisterBuyer(buyerRepository, passwordHasher);

    buyerRepository.findExistingIdentifiers.mockResolvedValue({
      email: true,
      username: true,
      phone: true
    });

    await expect(registerBuyer.execute(makeInput())).rejects.toMatchObject({
      name: "RegisterBuyerError",
      message: "Email is already in use.",
      statusCode: 409,
      field: "email"
    });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(buyerRepository.createBuyer).not.toHaveBeenCalled();
  });

  it("prioritizes username conflict over phone conflict when email is unique", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerBuyer = new RegisterBuyer(buyerRepository, passwordHasher);

    buyerRepository.findExistingIdentifiers.mockResolvedValue({
      email: false,
      username: true,
      phone: true
    });

    await expect(registerBuyer.execute(makeInput())).rejects.toMatchObject({
      name: "RegisterBuyerError",
      message: "Username is already in use.",
      statusCode: 409,
      field: "username"
    });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(buyerRepository.createBuyer).not.toHaveBeenCalled();
  });

  it("propagates repository lookup errors", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerBuyer = new RegisterBuyer(buyerRepository, passwordHasher);
    const lookupError = new Error("lookup failed");

    buyerRepository.findExistingIdentifiers.mockRejectedValue(lookupError);

    await expect(registerBuyer.execute(makeInput())).rejects.toThrow(lookupError);
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(buyerRepository.createBuyer).not.toHaveBeenCalled();
  });

  it("propagates password hashing errors", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerBuyer = new RegisterBuyer(buyerRepository, passwordHasher);
    const hashError = new Error("hash failed");

    passwordHasher.hash.mockRejectedValue(hashError);

    await expect(registerBuyer.execute(makeInput())).rejects.toThrow(hashError);
    expect(buyerRepository.createBuyer).not.toHaveBeenCalled();
  });

  it("propagates repository create errors", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerBuyer = new RegisterBuyer(buyerRepository, passwordHasher);
    const createError = new Error("create failed");

    buyerRepository.createBuyer.mockRejectedValue(createError);

    await expect(registerBuyer.execute(makeInput())).rejects.toThrow(createError);
  });

  it("returns a RegisterBuyerError instance for business validation failures", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerBuyer = new RegisterBuyer(buyerRepository, passwordHasher);

    buyerRepository.findExistingIdentifiers.mockResolvedValue({
      email: true,
      username: false,
      phone: false
    });

    await expect(registerBuyer.execute(makeInput())).rejects.toBeInstanceOf(
      RegisterBuyerError
    );
  });
});
