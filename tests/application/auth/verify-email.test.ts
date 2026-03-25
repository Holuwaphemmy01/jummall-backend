import { describe, expect, it, jest } from "@jest/globals";

import {
  VerifyEmail,
  VerifyEmailError
} from "../../../src/application/auth/verify-email";
import type {
  EmailVerificationRecord,
  EmailVerificationRepository,
  SaveEmailVerificationInput
} from "../../../src/ports/email-verification-repository";

class EmailVerificationRepositoryDouble implements EmailVerificationRepository {
  save = jest.fn<(input: SaveEmailVerificationInput) => Promise<void>>()
    .mockResolvedValue();

  findByEmail = jest
    .fn<(email: string) => Promise<EmailVerificationRecord | null>>()
    .mockResolvedValue({
      id: "verification-id",
      userId: "user-id",
      email: "john@example.com",
      firstName: "John",
      accountStatus: "not_verified",
      code: "123456",
      status: "active",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      verifiedAt: null,
      createdAt: new Date("2026-03-25T00:00:00.000Z")
    });

  markVerificationAsUsed = jest
    .fn<(input: { verificationId: string; userId: string }) => Promise<void>>()
    .mockResolvedValue();

  markVerificationAsExpired = jest
    .fn<(verificationId: string) => Promise<void>>()
    .mockResolvedValue();
}

describe("VerifyEmail", () => {
  it("verifies an email successfully with a valid code", async () => {
    const repository = new EmailVerificationRepositoryDouble();
    const verifyEmail = new VerifyEmail(repository);

    const result = await verifyEmail.execute({
      email: "john@example.com",
      code: "123456"
    });

    expect(repository.findByEmail).toHaveBeenCalledWith("john@example.com");
    expect(repository.markVerificationAsUsed).toHaveBeenCalledWith({
      verificationId: "verification-id",
      userId: "user-id"
    });
    expect(result).toEqual({
      email: "john@example.com",
      accountStatus: "verified"
    });
  });

  it("throws when verification request is not found", async () => {
    const repository = new EmailVerificationRepositoryDouble();
    repository.findByEmail.mockResolvedValue(null);
    const verifyEmail = new VerifyEmail(repository);

    await expect(
      verifyEmail.execute({
        email: "john@example.com",
        code: "123456"
      })
    ).rejects.toMatchObject({
      name: "VerifyEmailError",
      message: "Verification request not found.",
      statusCode: 404,
      field: "email"
    });
  });

  it("throws when the account is already verified", async () => {
    const repository = new EmailVerificationRepositoryDouble();
    repository.findByEmail.mockResolvedValue({
      id: "verification-id",
      userId: "user-id",
      email: "john@example.com",
      firstName: "John",
      accountStatus: "verified",
      code: "123456",
      status: "used",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      verifiedAt: new Date("2026-03-25T00:00:00.000Z"),
      createdAt: new Date("2026-03-25T00:00:00.000Z")
    });
    const verifyEmail = new VerifyEmail(repository);

    await expect(
      verifyEmail.execute({
        email: "john@example.com",
        code: "123456"
      })
    ).rejects.toMatchObject({
      name: "VerifyEmailError",
      message: "Account is already verified.",
      statusCode: 409,
      field: "email"
    });
  });

  it("throws when the verification code is invalid", async () => {
    const repository = new EmailVerificationRepositoryDouble();
    const verifyEmail = new VerifyEmail(repository);

    await expect(
      verifyEmail.execute({
        email: "john@example.com",
        code: "654321"
      })
    ).rejects.toMatchObject({
      name: "VerifyEmailError",
      message: "Invalid verification code.",
      statusCode: 400,
      field: "code"
    });
  });

  it("throws when the verification code has expired", async () => {
    const repository = new EmailVerificationRepositoryDouble();
    repository.findByEmail.mockResolvedValue({
      id: "verification-id",
      userId: "user-id",
      email: "john@example.com",
      firstName: "John",
      accountStatus: "not_verified",
      code: "123456",
      status: "active",
      expiresAt: new Date("2000-01-01T00:00:00.000Z"),
      verifiedAt: null,
      createdAt: new Date("2026-03-25T00:00:00.000Z")
    });
    const verifyEmail = new VerifyEmail(repository);

    await expect(
      verifyEmail.execute({
        email: "john@example.com",
        code: "123456"
      })
    ).rejects.toMatchObject({
      name: "VerifyEmailError",
      message: "Verification code has expired.",
      statusCode: 400,
      field: "code"
    });
    expect(repository.markVerificationAsExpired).toHaveBeenCalledWith(
      "verification-id"
    );
  });

  it("propagates repository update failures", async () => {
    const repository = new EmailVerificationRepositoryDouble();
    const verificationError = new Error("update failed");
    repository.markVerificationAsUsed.mockRejectedValue(verificationError);
    const verifyEmail = new VerifyEmail(repository);

    await expect(
      verifyEmail.execute({
        email: "john@example.com",
        code: "123456"
      })
    ).rejects.toThrow(verificationError);
  });

  it("returns a VerifyEmailError instance for verification rule failures", async () => {
    const repository = new EmailVerificationRepositoryDouble();
    repository.findByEmail.mockResolvedValue(null);
    const verifyEmail = new VerifyEmail(repository);

    await expect(
      verifyEmail.execute({
        email: "john@example.com",
        code: "123456"
      })
    ).rejects.toBeInstanceOf(VerifyEmailError);
  });
});
