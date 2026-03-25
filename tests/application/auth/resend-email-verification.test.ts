import { describe, expect, it, jest } from "@jest/globals";

import { InitiateEmailVerification } from "../../../src/application/auth/initiate-email-verification";
import {
  ResendEmailVerification,
  ResendEmailVerificationError
} from "../../../src/application/auth/resend-email-verification";
import type {
  EmailVerificationRecord,
  EmailVerificationRepository,
  SaveEmailVerificationInput
} from "../../../src/ports/email-verification-repository";
import type { MailProvider } from "../../../src/ports/mail-provider";
import type { VerificationCodeGenerator } from "../../../src/ports/verification-code-generator";

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

class VerificationCodeGeneratorDouble implements VerificationCodeGenerator {
  generate = jest.fn<() => Promise<string>>().mockResolvedValue("654321");
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
}

describe("ResendEmailVerification", () => {
  it("resends a verification email after the cooldown period", async () => {
    const repository = new EmailVerificationRepositoryDouble();
    const codeGenerator = new VerificationCodeGeneratorDouble();
    const mailProvider = new MailProviderDouble();
    const initiateEmailVerification = new InitiateEmailVerification(
      repository,
      codeGenerator,
      mailProvider
    );
    const resendEmailVerification = new ResendEmailVerification(
      repository,
      initiateEmailVerification,
      60_000,
      () => new Date("2026-03-25T00:02:00.000Z").getTime()
    );

    const result = await resendEmailVerification.execute({
      email: "john@example.com"
    });

    expect(repository.findByEmail).toHaveBeenCalledWith("john@example.com");
    expect(repository.save).toHaveBeenCalled();
    expect(mailProvider.sendEmailVerification).toHaveBeenCalledWith({
      to: "john@example.com",
      firstName: "John",
      code: "654321"
    });
    expect(result).toEqual({
      email: "john@example.com"
    });
  });

  it("throws when verification request is not found", async () => {
    const repository = new EmailVerificationRepositoryDouble();
    repository.findByEmail.mockResolvedValue(null);
    const resendEmailVerification = new ResendEmailVerification(
      repository,
      new InitiateEmailVerification(
        repository,
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      )
    );

    await expect(
      resendEmailVerification.execute({
        email: "john@example.com"
      })
    ).rejects.toMatchObject({
      name: "ResendEmailVerificationError",
      message: "Verification request not found.",
      statusCode: 404,
      field: "email"
    });
  });

  it("throws when account is already verified", async () => {
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
    const resendEmailVerification = new ResendEmailVerification(
      repository,
      new InitiateEmailVerification(
        repository,
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      )
    );

    await expect(
      resendEmailVerification.execute({
        email: "john@example.com"
      })
    ).rejects.toMatchObject({
      name: "ResendEmailVerificationError",
      message: "Account is already verified.",
      statusCode: 409,
      field: "email"
    });
  });

  it("throws when resend is requested before 1 minute has passed", async () => {
    const repository = new EmailVerificationRepositoryDouble();
    const resendEmailVerification = new ResendEmailVerification(
      repository,
      new InitiateEmailVerification(
        repository,
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      ),
      60_000,
      () => new Date("2026-03-25T00:00:30.000Z").getTime()
    );

    await expect(
      resendEmailVerification.execute({
        email: "john@example.com"
      })
    ).rejects.toMatchObject({
      name: "ResendEmailVerificationError",
      message:
        "Please wait at least 1 minute before requesting another verification email.",
      statusCode: 429,
      field: "email"
    });
  });

  it("propagates resend initiation failures", async () => {
    const repository = new EmailVerificationRepositoryDouble();
    const codeGenerator = new VerificationCodeGeneratorDouble();
    const mailProvider = new MailProviderDouble();
    const resendError = new Error("resend failed");
    mailProvider.sendEmailVerification.mockRejectedValue(resendError);
    const resendEmailVerification = new ResendEmailVerification(
      repository,
      new InitiateEmailVerification(repository, codeGenerator, mailProvider),
      60_000,
      () => new Date("2026-03-25T00:02:00.000Z").getTime()
    );

    await expect(
      resendEmailVerification.execute({
        email: "john@example.com"
      })
    ).rejects.toThrow(resendError);
  });

  it("returns a ResendEmailVerificationError instance for resend rule failures", async () => {
    const repository = new EmailVerificationRepositoryDouble();
    repository.findByEmail.mockResolvedValue(null);
    const resendEmailVerification = new ResendEmailVerification(
      repository,
      new InitiateEmailVerification(
        repository,
        new VerificationCodeGeneratorDouble(),
        new MailProviderDouble()
      )
    );

    await expect(
      resendEmailVerification.execute({
        email: "john@example.com"
      })
    ).rejects.toBeInstanceOf(ResendEmailVerificationError);
  });
});
