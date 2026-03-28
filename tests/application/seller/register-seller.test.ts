import { describe, expect, it, jest } from "@jest/globals";

import { InitiateEmailVerification } from "../../../src/application/auth/initiate-email-verification";
import { SendWelcomeEmail } from "../../../src/application/notification/send-welcome-email";
import {
  RegisterSeller,
  RegisterSellerError,
  type RegisterSellerInput
} from "../../../src/application/seller/register-seller";
import type {
  EmailVerificationRecord,
  EmailVerificationRepository,
  SaveEmailVerificationInput
} from "../../../src/ports/email-verification-repository";
import type { MailProvider } from "../../../src/ports/mail-provider";
import type { PasswordHasher } from "../../../src/ports/password-hasher";
import type {
  CreateSellerInput,
  ExistingSellerIdentifiers,
  FindExistingSellerIdentifiersInput,
  SellerRecord,
  SellerRepository
} from "../../../src/ports/seller-repository";
import type { VerificationCodeGenerator } from "../../../src/ports/verification-code-generator";

class SellerRepositoryDouble implements SellerRepository {
  findExistingIdentifiers = jest
    .fn<
      (input: FindExistingSellerIdentifiersInput) => Promise<ExistingSellerIdentifiers>
    >()
    .mockResolvedValue({
      email: false,
      username: false,
      phone: false
    });

  createSeller = jest
    .fn<(input: CreateSellerInput) => Promise<SellerRecord>>()
    .mockImplementation(async (input) => ({
      id: "seller-id",
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
      email: input.email,
      phone: input.phone,
      role: "seller",
      accountStatus: "not_verified",
      accountType: input.accountType,
      kycStatus: "not_started",
      createdAt: new Date("2026-03-25T00:00:00.000Z"),
      updatedAt: new Date("2026-03-25T00:00:00.000Z")
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

function makeInput(): RegisterSellerInput {
  return {
    firstName: "Jane",
    lastName: "Doe",
    username: "jane.doe",
    email: "jane@example.com",
    phone: "+2348012345678",
    password: "Password123",
    confirmPassword: "Password123",
    accountType: "individual"
  };
}

describe("RegisterSeller", () => {
  it("registers a seller successfully and initializes KYC", async () => {
    const sellerRepository = new SellerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const emailVerificationRepository = new EmailVerificationRepositoryDouble();
    const verificationCodeGenerator = new VerificationCodeGeneratorDouble();
    const mailProvider = new MailProviderDouble();
    const registerSeller = new RegisterSeller(
      sellerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        emailVerificationRepository,
        verificationCodeGenerator,
        mailProvider
      ),
      new SendWelcomeEmail(mailProvider)
    );

    const result = await registerSeller.execute(makeInput());

    expect(sellerRepository.findExistingIdentifiers).toHaveBeenCalledWith({
      email: "jane@example.com",
      username: "jane.doe",
      phone: "+2348012345678"
    });
    expect(passwordHasher.hash).toHaveBeenCalledWith("Password123");
    expect(sellerRepository.createSeller).toHaveBeenCalledWith({
      firstName: "Jane",
      lastName: "Doe",
      username: "jane.doe",
      email: "jane@example.com",
      phone: "+2348012345678",
      passwordHash: "hashed-password",
      accountType: "individual"
    });
    expect(result).toMatchObject({
      id: "seller-id",
      username: "jane.doe",
      role: "seller",
      accountStatus: "not_verified",
      accountType: "individual",
      kycStatus: "not_started"
    });
    expect(emailVerificationRepository.save).toHaveBeenCalled();
    expect(mailProvider.sendEmailVerification).toHaveBeenCalledWith({
      to: "jane@example.com",
      firstName: "Jane",
      code: "123456"
    });
    expect(mailProvider.sendWelcomeEmail).toHaveBeenCalledWith({
      to: "jane@example.com",
      firstName: "Jane",
      role: "seller"
    });
  });

  it("throws when confirm password does not match", async () => {
    const sellerRepository = new SellerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerSeller = new RegisterSeller(
      sellerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );
    const input = {
      ...makeInput(),
      confirmPassword: "AnotherPassword123"
    };

    await expect(registerSeller.execute(input)).rejects.toMatchObject({
      name: "RegisterSellerError",
      message: "Confirm password does not match password.",
      statusCode: 400,
      field: "confirm_password"
    });
    expect(sellerRepository.findExistingIdentifiers).not.toHaveBeenCalled();
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(sellerRepository.createSeller).not.toHaveBeenCalled();
  });

  it("throws when email is already in use", async () => {
    const sellerRepository = new SellerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerSeller = new RegisterSeller(
      sellerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );

    sellerRepository.findExistingIdentifiers.mockResolvedValue({
      email: true,
      username: false,
      phone: false
    });

    await expect(registerSeller.execute(makeInput())).rejects.toMatchObject({
      name: "RegisterSellerError",
      message: "Email is already in use.",
      statusCode: 409,
      field: "email"
    });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(sellerRepository.createSeller).not.toHaveBeenCalled();
  });

  it("throws when username is already in use", async () => {
    const sellerRepository = new SellerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerSeller = new RegisterSeller(
      sellerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );

    sellerRepository.findExistingIdentifiers.mockResolvedValue({
      email: false,
      username: true,
      phone: false
    });

    await expect(registerSeller.execute(makeInput())).rejects.toMatchObject({
      name: "RegisterSellerError",
      message: "Username is already in use.",
      statusCode: 409,
      field: "username"
    });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(sellerRepository.createSeller).not.toHaveBeenCalled();
  });

  it("throws when phone number is already in use", async () => {
    const sellerRepository = new SellerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerSeller = new RegisterSeller(
      sellerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );

    sellerRepository.findExistingIdentifiers.mockResolvedValue({
      email: false,
      username: false,
      phone: true
    });

    await expect(registerSeller.execute(makeInput())).rejects.toMatchObject({
      name: "RegisterSellerError",
      message: "Phone number is already in use.",
      statusCode: 409,
      field: "phone_number"
    });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(sellerRepository.createSeller).not.toHaveBeenCalled();
  });

  it("propagates lookup failures", async () => {
    const sellerRepository = new SellerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerSeller = new RegisterSeller(
      sellerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );
    const lookupError = new Error("lookup failed");

    sellerRepository.findExistingIdentifiers.mockRejectedValue(lookupError);

    await expect(registerSeller.execute(makeInput())).rejects.toThrow(lookupError);
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(sellerRepository.createSeller).not.toHaveBeenCalled();
  });

  it("propagates password hashing failures", async () => {
    const sellerRepository = new SellerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerSeller = new RegisterSeller(
      sellerRepository,
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

    await expect(registerSeller.execute(makeInput())).rejects.toThrow(hashError);
    expect(sellerRepository.createSeller).not.toHaveBeenCalled();
  });

  it("propagates seller creation failures", async () => {
    const sellerRepository = new SellerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerSeller = new RegisterSeller(
      sellerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );
    const createError = new Error("create failed");

    sellerRepository.createSeller.mockRejectedValue(createError);

    await expect(registerSeller.execute(makeInput())).rejects.toThrow(createError);
  });

  it("returns a RegisterSellerError instance for business validation failures", async () => {
    const sellerRepository = new SellerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const registerSeller = new RegisterSeller(
      sellerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );

    sellerRepository.findExistingIdentifiers.mockResolvedValue({
      email: true,
      username: false,
      phone: false
    });

    await expect(registerSeller.execute(makeInput())).rejects.toBeInstanceOf(
      RegisterSellerError
    );
  });

  it("propagates email verification initiation failures", async () => {
    const sellerRepository = new SellerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const mailProvider = new MailProviderDouble();
    const emailError = new Error("email failed");

    mailProvider.sendEmailVerification.mockRejectedValue(emailError);

    const registerSeller = new RegisterSeller(
      sellerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        mailProvider
      ),
      new SendWelcomeEmail(new MailProviderDouble())
    );

    await expect(registerSeller.execute(makeInput())).rejects.toThrow(emailError);
  });

  it("propagates welcome email failures", async () => {
    const sellerRepository = new SellerRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const mailProvider = new MailProviderDouble();
    const welcomeError = new Error("welcome failed");

    mailProvider.sendWelcomeEmail.mockRejectedValue(welcomeError);

    const registerSeller = new RegisterSeller(
      sellerRepository,
      passwordHasher,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        mailProvider
      ),
      new SendWelcomeEmail(mailProvider)
    );

    await expect(registerSeller.execute(makeInput())).rejects.toThrow(welcomeError);
  });
});
