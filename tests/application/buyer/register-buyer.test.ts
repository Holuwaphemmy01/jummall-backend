import { describe, expect, it, jest } from "@jest/globals";

import {
  InitiateEmailVerification
} from "../../../src/application/auth/initiate-email-verification";
import { SendWelcomeEmail } from "../../../src/application/notification/send-welcome-email";
import {
  RegisterBuyer,
  RegisterBuyerError,
  type RegisterBuyerInput
} from "../../../src/application/buyer/register-buyer";
import type {
  EmailVerificationRecord,
  EmailVerificationRepository,
  SaveEmailVerificationInput
} from "../../../src/ports/email-verification-repository";
import type { MailProvider } from "../../../src/ports/mail-provider";
import type {
  BuyerRecord,
  BuyerRepository,
  CreateBuyerInput,
  ExistingBuyerIdentifiers,
  FindExistingBuyerIdentifiersInput
} from "../../../src/ports/buyer-repository";
import type { PasswordHasher } from "../../../src/ports/password-hasher";
import type { VerificationCodeGenerator } from "../../../src/ports/verification-code-generator";

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
      accountStatus: "not_verified",
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

class EmailVerificationRepositoryDouble implements EmailVerificationRepository {
  save = jest.fn<(input: SaveEmailVerificationInput) => Promise<void>>()
    .mockResolvedValue();

  findByEmail = jest
    .fn<(email: string) => Promise<EmailVerificationRecord | null>>()
    .mockResolvedValue(null);

  markVerificationAsUsed = jest
    .fn<(input: { verificationId: string; userId: string }) => Promise<void>>()
    .mockResolvedValue();

  markVerificationAsExpired = jest
    .fn<(verificationId: string) => Promise<void>>()
    .mockResolvedValue();
}

class VerificationCodeGeneratorDouble implements VerificationCodeGenerator {
  generate = jest.fn<() => Promise<string>>().mockResolvedValue("123456");
}

class MailProviderDouble implements MailProvider {
  sendEmailVerification = jest
    .fn<(input: { to: string; firstName: string | null; code: string }) => Promise<void>>()
    .mockResolvedValue();

  sendWelcomeEmail = jest
    .fn<
      (input: {
        to: string;
        firstName: string | null;
        role: "buyer" | "seller";
      }) => Promise<void>
    >()
    .mockResolvedValue();

  sendPasswordResetEmail = jest
    .fn<(input: { to: string; firstName: string | null; code: string }) => Promise<void>>()
    .mockResolvedValue();
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
    const emailVerificationRepository = new EmailVerificationRepositoryDouble();
    const verificationCodeGenerator = new VerificationCodeGeneratorDouble();
    const mailProvider = new MailProviderDouble();
    const initiateEmailVerification = new InitiateEmailVerification(
      emailVerificationRepository,
      verificationCodeGenerator,
      mailProvider
    );
    const registerBuyer = new RegisterBuyer(
      buyerRepository,
      passwordHasher,
      initiateEmailVerification,
      new SendWelcomeEmail(mailProvider)
    );

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
      role: "buyer",
      accountStatus: "not_verified"
    });
    expect(emailVerificationRepository.save).toHaveBeenCalled();
    expect(mailProvider.sendEmailVerification).toHaveBeenCalledWith({
      to: "john@example.com",
      firstName: "John",
      code: "123456"
    });
    expect(mailProvider.sendWelcomeEmail).toHaveBeenCalledWith({
      to: "john@example.com",
      firstName: "John",
      role: "buyer"
    });
  });

  it("throws when password confirmation does not match", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const initiateEmailVerification = new InitiateEmailVerification(
      new EmailVerificationRepositoryDouble(),
      new VerificationCodeGeneratorDouble(),
      new MailProviderDouble()
    );
    const registerBuyer = new RegisterBuyer(
      buyerRepository,
      passwordHasher,
      initiateEmailVerification,
      new SendWelcomeEmail(new MailProviderDouble())
    );
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
    const registerBuyer = new RegisterBuyer(
      buyerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );

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
    const registerBuyer = new RegisterBuyer(
      buyerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );

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
    const registerBuyer = new RegisterBuyer(
      buyerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );

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
    const registerBuyer = new RegisterBuyer(
      buyerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );

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
    const registerBuyer = new RegisterBuyer(
      buyerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );

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
    const registerBuyer = new RegisterBuyer(
      buyerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );
    const lookupError = new Error("lookup failed");

    buyerRepository.findExistingIdentifiers.mockRejectedValue(lookupError);

    await expect(registerBuyer.execute(makeInput())).rejects.toThrow(lookupError);
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(buyerRepository.createBuyer).not.toHaveBeenCalled();
  });

  it("propagates password hashing errors", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerBuyer = new RegisterBuyer(
      buyerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );
    const hashError = new Error("hash failed");

    passwordHasher.hash.mockRejectedValue(hashError);

    await expect(registerBuyer.execute(makeInput())).rejects.toThrow(hashError);
    expect(buyerRepository.createBuyer).not.toHaveBeenCalled();
  });

  it("propagates repository create errors", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerBuyer = new RegisterBuyer(
      buyerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );
    const createError = new Error("create failed");

    buyerRepository.createBuyer.mockRejectedValue(createError);

    await expect(registerBuyer.execute(makeInput())).rejects.toThrow(createError);
  });

  it("returns a RegisterBuyerError instance for business validation failures", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerBuyer = new RegisterBuyer(
      buyerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );

    buyerRepository.findExistingIdentifiers.mockResolvedValue({
      email: true,
      username: false,
      phone: false
    });

    await expect(registerBuyer.execute(makeInput())).rejects.toBeInstanceOf(
      RegisterBuyerError
    );
  });

  it("propagates email verification initiation failures", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const emailVerificationRepository = new EmailVerificationRepositoryDouble();
    const verificationCodeGenerator = new VerificationCodeGeneratorDouble();
    const mailProvider = new MailProviderDouble();
    const emailError = new Error("email failed");

    mailProvider.sendEmailVerification.mockRejectedValue(emailError);

    const registerBuyer = new RegisterBuyer(
      buyerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        emailVerificationRepository,
        verificationCodeGenerator,
        mailProvider
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );

    await expect(registerBuyer.execute(makeInput())).rejects.toThrow(emailError);
  });

  it("propagates welcome email failures", async () => {
    const buyerRepository = new BuyerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const emailVerificationRepository = new EmailVerificationRepositoryDouble();
    const verificationCodeGenerator = new VerificationCodeGeneratorDouble();
    const mailProvider = new MailProviderDouble();
    const welcomeError = new Error("welcome failed");

    mailProvider.sendWelcomeEmail.mockRejectedValue(welcomeError);

    const registerBuyer = new RegisterBuyer(
      buyerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        emailVerificationRepository,
        verificationCodeGenerator,
        mailProvider
      ),
      new SendWelcomeEmail(mailProvider)
    );

    await expect(registerBuyer.execute(makeInput())).rejects.toThrow(welcomeError);
  });
});
