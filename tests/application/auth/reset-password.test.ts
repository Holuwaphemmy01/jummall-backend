import { describe, expect, it, jest } from "@jest/globals";

import {
  ResetPassword,
  ResetPasswordError
} from "../../../src/application/auth/reset-password";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type { PasswordHasher } from "../../../src/ports/password-hasher";
import type {
  PasswordResetRecord,
  PasswordResetRepository,
  SavePasswordResetInput
} from "../../../src/ports/password-reset-repository";

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  findByEmail = jest
    .fn<(email: string) => Promise<AuthUser | null>>()
    .mockResolvedValue(null);

  updatePassword = jest
    .fn<(input: { userId: string; passwordHash: string }) => Promise<void>>()
    .mockResolvedValue();
}

class PasswordResetRepositoryDouble implements PasswordResetRepository {
  save = jest.fn<(input: SavePasswordResetInput) => Promise<void>>()
    .mockResolvedValue();

  findByEmailAndCode = jest
    .fn<(email: string, code: string) => Promise<PasswordResetRecord | null>>()
    .mockResolvedValue({
      id: "reset-id",
      userId: "user-id",
      email: "john@example.com",
      firstName: "John",
      code: "123456",
      status: "active",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      usedAt: null,
      createdAt: new Date("2026-03-27T00:00:00.000Z")
    });

  markAsUsed = jest.fn<(resetId: string) => Promise<void>>().mockResolvedValue();

  markAsExpired = jest
    .fn<(resetId: string) => Promise<void>>()
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

describe("ResetPassword", () => {
  it("resets password successfully with a valid code", async () => {
    const passwordResetRepository = new PasswordResetRepositoryDouble();
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const resetPassword = new ResetPassword(
      passwordResetRepository,
      authenticationRepository,
      passwordHasher
    );

    await resetPassword.execute({
      email: "john@example.com",
      code: "123456",
      password: "NewPassword123",
      confirmPassword: "NewPassword123"
    });

    expect(passwordHasher.hash).toHaveBeenCalledWith("NewPassword123");
    expect(authenticationRepository.updatePassword).toHaveBeenCalledWith({
      userId: "user-id",
      passwordHash: "hashed-password"
    });
    expect(passwordResetRepository.markAsUsed).toHaveBeenCalledWith("reset-id");
  });

  it("throws when password confirmation does not match", async () => {
    const resetPassword = new ResetPassword(
      new PasswordResetRepositoryDouble(),
      new AuthenticationRepositoryDouble(),
      new PasswordHasherDouble()
    );

    await expect(
      resetPassword.execute({
        email: "john@example.com",
        code: "123456",
        password: "NewPassword123",
        confirmPassword: "MismatchPassword123"
      })
    ).rejects.toBeInstanceOf(ResetPasswordError);
  });

  it("marks the reset code as expired when it has expired", async () => {
    const passwordResetRepository = new PasswordResetRepositoryDouble();
    passwordResetRepository.findByEmailAndCode.mockResolvedValue({
      id: "reset-id",
      userId: "user-id",
      email: "john@example.com",
      firstName: "John",
      code: "123456",
      status: "active",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      usedAt: null,
      createdAt: new Date("2026-03-27T00:00:00.000Z")
    });
    const resetPassword = new ResetPassword(
      passwordResetRepository,
      new AuthenticationRepositoryDouble(),
      new PasswordHasherDouble()
    );

    await expect(
      resetPassword.execute({
        email: "john@example.com",
        code: "123456",
        password: "NewPassword123",
        confirmPassword: "NewPassword123"
      })
    ).rejects.toBeInstanceOf(ResetPasswordError);
    expect(passwordResetRepository.markAsExpired).toHaveBeenCalledWith("reset-id");
  });
});
