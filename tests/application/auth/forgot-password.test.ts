import { describe, expect, it, jest } from "@jest/globals";

import { ForgotPassword } from "../../../src/application/auth/forgot-password";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type { MailProvider } from "../../../src/ports/mail-provider";
import type {
  PasswordResetRecord,
  PasswordResetRepository,
  SavePasswordResetInput
} from "../../../src/ports/password-reset-repository";
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

class PasswordResetRepositoryDouble implements PasswordResetRepository {
  save = jest.fn<(input: SavePasswordResetInput) => Promise<void>>()
    .mockResolvedValue();

  findByEmailAndCode = jest
    .fn<(email: string, code: string) => Promise<PasswordResetRecord | null>>()
    .mockResolvedValue(null);

  markAsUsed = jest.fn<(resetId: string) => Promise<void>>().mockResolvedValue();

  markAsExpired = jest
    .fn<(resetId: string) => Promise<void>>()
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

describe("ForgotPassword", () => {
  it("creates a password reset code and sends mail when the user exists", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const passwordResetRepository = new PasswordResetRepositoryDouble();
    const verificationCodeGenerator = new VerificationCodeGeneratorDouble();
    const mailProvider = new MailProviderDouble();
    const forgotPassword = new ForgotPassword(
      authenticationRepository,
      passwordResetRepository,
      verificationCodeGenerator,
      mailProvider
    );

    await forgotPassword.execute({
      email: "john@example.com"
    });

    expect(authenticationRepository.findByEmail).toHaveBeenCalledWith(
      "john@example.com"
    );
    expect(passwordResetRepository.save).toHaveBeenCalledWith({
      userId: "user-id",
      code: "123456",
      expiresAt: expect.any(Date)
    });
    expect(mailProvider.sendPasswordResetEmail).toHaveBeenCalledWith({
      to: "john@example.com",
      firstName: "John",
      code: "123456"
    });
  });

  it("returns quietly when the user does not exist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findByEmail.mockResolvedValue(null);
    const forgotPassword = new ForgotPassword(
      authenticationRepository,
      new PasswordResetRepositoryDouble(),
      new VerificationCodeGeneratorDouble(),
      new MailProviderDouble()
    );

    await expect(
      forgotPassword.execute({
        email: "missing@example.com"
      })
    ).resolves.toBeUndefined();
  });
});
