import { describe, expect, it, jest } from "@jest/globals";

import { InitiateEmailVerification } from "../../../src/application/auth/initiate-email-verification";
import {
  Login,
  LoginError,
  type LoginInput
} from "../../../src/application/auth/login";
import type {
  EmailVerificationRecord,
  EmailVerificationRepository,
  SaveEmailVerificationInput
} from "../../../src/ports/email-verification-repository";
import type { MailProvider } from "../../../src/ports/mail-provider";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type { PasswordHasher } from "../../../src/ports/password-hasher";
import type { TokenPayload, TokenSigner } from "../../../src/ports/token-signer";
import type { VerificationCodeGenerator } from "../../../src/ports/verification-code-generator";

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  findByEmail = jest
    .fn<(email: string) => Promise<AuthUser | null>>()
    .mockResolvedValue({
      id: "user-id",
      firstName: "John",
      lastName: "Doe",
      username: "john.doe",
      email: "john@example.com",
      phone: "+2348012345678",
      passwordHash: "stored-password-hash",
      role: "buyer",
      accountStatus: "verified",
      createdAt: new Date("2026-03-24T00:00:00.000Z"),
      updatedAt: new Date("2026-03-24T00:00:00.000Z")
    });

  updatePassword = jest
    .fn<(input: { userId: string; passwordHash: string }) => Promise<void>>()
    .mockResolvedValue();
}

class PasswordHasherDouble implements PasswordHasher {
  hash = jest
    .fn<(value: string) => Promise<string>>()
    .mockResolvedValue("hashed-password");

  compare = jest
    .fn<(value: string, hash: string) => Promise<boolean>>()
    .mockResolvedValue(true);
}

class TokenSignerDouble implements TokenSigner {
  sign = jest
    .fn<(payload: TokenPayload) => Promise<string>>()
    .mockResolvedValue("jwt-token");
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

function makeInput(): LoginInput {
  return {
    email: "john@example.com",
    password: "Password123"
  };
}

describe("Login", () => {
  it("logs in successfully and returns the user profile with a token", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const tokenSigner = new TokenSignerDouble();
    const initiateEmailVerification = new InitiateEmailVerification(
      new EmailVerificationRepositoryDouble(),
      new VerificationCodeGeneratorDouble(),
      new MailProviderDouble()
    );
    const login = new Login(
      authenticationRepository,
      passwordHasher,
      tokenSigner,
      initiateEmailVerification
    );

    const result = await login.execute(makeInput());

    expect(authenticationRepository.findByEmail).toHaveBeenCalledWith(
      "john@example.com"
    );
    expect(passwordHasher.compare).toHaveBeenCalledWith(
      "Password123",
      "stored-password-hash"
    );
    expect(tokenSigner.sign).toHaveBeenCalledWith({
      sub: "user-id",
      email: "john@example.com",
      role: "buyer"
    });
    expect(result).toMatchObject({
      accessToken: "jwt-token",
      user: {
        id: "user-id",
        email: "john@example.com",
        role: "buyer",
        accountStatus: "verified"
      }
    });
  });

  it("throws when the user does not exist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const tokenSigner = new TokenSignerDouble();
    const initiateEmailVerification = new InitiateEmailVerification(
      new EmailVerificationRepositoryDouble(),
      new VerificationCodeGeneratorDouble(),
      new MailProviderDouble()
    );
    const login = new Login(
      authenticationRepository,
      passwordHasher,
      tokenSigner,
      initiateEmailVerification
    );

    authenticationRepository.findByEmail.mockResolvedValue(null);

    await expect(login.execute(makeInput())).rejects.toMatchObject({
      name: "LoginError",
      message: "Invalid email or password.",
      statusCode: 401
    });
    expect(passwordHasher.compare).not.toHaveBeenCalled();
    expect(tokenSigner.sign).not.toHaveBeenCalled();
  });

  it("throws when the account is not verified", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const tokenSigner = new TokenSignerDouble();
    const emailVerificationRepository = new EmailVerificationRepositoryDouble();
    const verificationCodeGenerator = new VerificationCodeGeneratorDouble();
    const mailProvider = new MailProviderDouble();
    const initiateEmailVerification = new InitiateEmailVerification(
      emailVerificationRepository,
      verificationCodeGenerator,
      mailProvider
    );
    const login = new Login(
      authenticationRepository,
      passwordHasher,
      tokenSigner,
      initiateEmailVerification
    );

    authenticationRepository.findByEmail.mockResolvedValue({
      id: "user-id",
      firstName: "John",
      lastName: "Doe",
      username: "john.doe",
      email: "john@example.com",
      phone: "+2348012345678",
      passwordHash: "stored-password-hash",
      role: "buyer",
      accountStatus: "not_verified",
      createdAt: new Date("2026-03-24T00:00:00.000Z"),
      updatedAt: new Date("2026-03-24T00:00:00.000Z")
    });

    await expect(login.execute(makeInput())).rejects.toMatchObject({
      name: "LoginError",
      message: "Account is not verified.",
      statusCode: 403
    });
    expect(emailVerificationRepository.save).toHaveBeenCalledWith({
      userId: "user-id",
      code: "123456",
      expiresAt: expect.any(Date)
    });
    expect(mailProvider.sendEmailVerification).toHaveBeenCalledWith({
      to: "john@example.com",
      firstName: "John",
      code: "123456"
    });
    expect(tokenSigner.sign).not.toHaveBeenCalled();
  });

  it("throws when the password is invalid", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const tokenSigner = new TokenSignerDouble();
    const initiateEmailVerification = new InitiateEmailVerification(
      new EmailVerificationRepositoryDouble(),
      new VerificationCodeGeneratorDouble(),
      new MailProviderDouble()
    );
    const login = new Login(
      authenticationRepository,
      passwordHasher,
      tokenSigner,
      initiateEmailVerification
    );

    passwordHasher.compare.mockResolvedValue(false);

    await expect(login.execute(makeInput())).rejects.toMatchObject({
      name: "LoginError",
      message: "Invalid email or password.",
      statusCode: 401
    });
    expect(tokenSigner.sign).not.toHaveBeenCalled();
  });

  it("propagates repository lookup failures", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const tokenSigner = new TokenSignerDouble();
    const initiateEmailVerification = new InitiateEmailVerification(
      new EmailVerificationRepositoryDouble(),
      new VerificationCodeGeneratorDouble(),
      new MailProviderDouble()
    );
    const login = new Login(
      authenticationRepository,
      passwordHasher,
      tokenSigner,
      initiateEmailVerification
    );
    const lookupError = new Error("lookup failed");

    authenticationRepository.findByEmail.mockRejectedValue(lookupError);

    await expect(login.execute(makeInput())).rejects.toThrow(lookupError);
    expect(passwordHasher.compare).not.toHaveBeenCalled();
    expect(tokenSigner.sign).not.toHaveBeenCalled();
  });

  it("propagates password verification failures", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const tokenSigner = new TokenSignerDouble();
    const initiateEmailVerification = new InitiateEmailVerification(
      new EmailVerificationRepositoryDouble(),
      new VerificationCodeGeneratorDouble(),
      new MailProviderDouble()
    );
    const login = new Login(
      authenticationRepository,
      passwordHasher,
      tokenSigner,
      initiateEmailVerification
    );
    const compareError = new Error("compare failed");

    passwordHasher.compare.mockRejectedValue(compareError);

    await expect(login.execute(makeInput())).rejects.toThrow(compareError);
    expect(tokenSigner.sign).not.toHaveBeenCalled();
  });

  it("propagates token signing failures", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const tokenSigner = new TokenSignerDouble();
    const initiateEmailVerification = new InitiateEmailVerification(
      new EmailVerificationRepositoryDouble(),
      new VerificationCodeGeneratorDouble(),
      new MailProviderDouble()
    );
    const login = new Login(
      authenticationRepository,
      passwordHasher,
      tokenSigner,
      initiateEmailVerification
    );
    const tokenError = new Error("token failed");

    tokenSigner.sign.mockRejectedValue(tokenError);

    await expect(login.execute(makeInput())).rejects.toThrow(tokenError);
  });

  it("returns a LoginError instance for invalid credentials", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const tokenSigner = new TokenSignerDouble();
    const initiateEmailVerification = new InitiateEmailVerification(
      new EmailVerificationRepositoryDouble(),
      new VerificationCodeGeneratorDouble(),
      new MailProviderDouble()
    );
    const login = new Login(
      authenticationRepository,
      passwordHasher,
      tokenSigner,
      initiateEmailVerification
    );

    authenticationRepository.findByEmail.mockResolvedValue(null);

    await expect(login.execute(makeInput())).rejects.toBeInstanceOf(LoginError);
  });

  it("propagates email verification initiation failures for unverified users", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const tokenSigner = new TokenSignerDouble();
    const mailProvider = new MailProviderDouble();
    const emailError = new Error("email failed");

    authenticationRepository.findByEmail.mockResolvedValue({
      id: "user-id",
      firstName: "John",
      lastName: "Doe",
      username: "john.doe",
      email: "john@example.com",
      phone: "+2348012345678",
      passwordHash: "stored-password-hash",
      role: "buyer",
      accountStatus: "not_verified",
      createdAt: new Date("2026-03-24T00:00:00.000Z"),
      updatedAt: new Date("2026-03-24T00:00:00.000Z")
    });
    mailProvider.sendEmailVerification.mockRejectedValue(emailError);

    const login = new Login(
      authenticationRepository,
      passwordHasher,
      tokenSigner,
      new InitiateEmailVerification(
        new EmailVerificationRepositoryDouble(),
        new VerificationCodeGeneratorDouble(),
        mailProvider
      )
    );

    await expect(login.execute(makeInput())).rejects.toThrow(emailError);
    expect(tokenSigner.sign).not.toHaveBeenCalled();
  });
});
