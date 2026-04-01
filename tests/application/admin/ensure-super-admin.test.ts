import { describe, expect, it, jest } from "@jest/globals";

import {
  EnsureSuperAdmin,
  EnsureSuperAdminError
} from "../../../src/application/admin/ensure-super-admin";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type { PasswordHasher } from "../../../src/ports/password-hasher";
import type {
  CreateSuperAdminInput,
  MarkUserAsVerifiedInput,
  SuperAdminRepository
} from "../../../src/ports/super-admin-repository";

function makeAdminUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "admin-id",
    firstName: "Super",
    lastName: "Admin",
    username: null,
    email: "superadmin@example.com",
    phone: null,
    passwordHash: "stored-password-hash",
    role: "admin",
    accountStatus: "verified",
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    ...overrides
  };
}

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  findByEmail = jest
    .fn<(email: string) => Promise<AuthUser | null>>()
    .mockResolvedValue(null);

  findById = jest
    .fn<(userId: string) => Promise<AuthUser | null>>()
    .mockResolvedValue(null);

  updatePassword = jest
    .fn<(input: { userId: string; passwordHash: string }) => Promise<void>>()
    .mockResolvedValue();
}

class SuperAdminRepositoryDouble implements SuperAdminRepository {
  createSuperAdmin = jest
    .fn<(input: CreateSuperAdminInput) => Promise<void>>()
    .mockResolvedValue();

  markUserAsVerified = jest
    .fn<(input: MarkUserAsVerifiedInput) => Promise<void>>()
    .mockResolvedValue();
}

class PasswordHasherDouble implements PasswordHasher {
  hash = jest
    .fn<(value: string) => Promise<string>>()
    .mockResolvedValue("new-password-hash");

  compare = jest
    .fn<(value: string, hash: string) => Promise<boolean>>()
    .mockResolvedValue(true);
}

describe("EnsureSuperAdmin", () => {
  it("skips bootstrap when no env credentials are provided", async () => {
    const ensureSuperAdmin = new EnsureSuperAdmin(
      new AuthenticationRepositoryDouble(),
      new SuperAdminRepositoryDouble(),
      new PasswordHasherDouble()
    );

    const result = await ensureSuperAdmin.execute({});

    expect(result).toEqual({
      status: "skipped",
      email: null
    });
  });

  it("creates the super admin when no matching user exists", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const superAdminRepository = new SuperAdminRepositoryDouble();
    const passwordHasher = new PasswordHasherDouble();
    const ensureSuperAdmin = new EnsureSuperAdmin(
      authenticationRepository,
      superAdminRepository,
      passwordHasher
    );

    const result = await ensureSuperAdmin.execute({
      email: "superadmin@example.com",
      password: "Password123"
    });

    expect(authenticationRepository.findByEmail).toHaveBeenCalledWith(
      "superadmin@example.com"
    );
    expect(passwordHasher.hash).toHaveBeenCalledWith("Password123");
    expect(superAdminRepository.createSuperAdmin).toHaveBeenCalledWith({
      email: "superadmin@example.com",
      passwordHash: "new-password-hash"
    });
    expect(result).toEqual({
      status: "created",
      email: "superadmin@example.com"
    });
  });

  it("updates the existing admin password when the env password changes", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findByEmail.mockResolvedValue(makeAdminUser());
    const passwordHasher = new PasswordHasherDouble();
    passwordHasher.compare.mockResolvedValue(false);
    const ensureSuperAdmin = new EnsureSuperAdmin(
      authenticationRepository,
      new SuperAdminRepositoryDouble(),
      passwordHasher
    );

    const result = await ensureSuperAdmin.execute({
      email: "superadmin@example.com",
      password: "NewPassword123"
    });

    expect(passwordHasher.compare).toHaveBeenCalledWith(
      "NewPassword123",
      "stored-password-hash"
    );
    expect(authenticationRepository.updatePassword).toHaveBeenCalledWith({
      userId: "admin-id",
      passwordHash: "new-password-hash"
    });
    expect(result).toEqual({
      status: "updated",
      email: "superadmin@example.com"
    });
  });

  it("marks the existing admin as verified when necessary", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findByEmail.mockResolvedValue(
      makeAdminUser({
        accountStatus: "not_verified"
      })
    );
    const superAdminRepository = new SuperAdminRepositoryDouble();
    const ensureSuperAdmin = new EnsureSuperAdmin(
      authenticationRepository,
      superAdminRepository,
      new PasswordHasherDouble()
    );

    const result = await ensureSuperAdmin.execute({
      email: "superadmin@example.com",
      password: "Password123"
    });

    expect(superAdminRepository.markUserAsVerified).toHaveBeenCalledWith({
      userId: "admin-id"
    });
    expect(result).toEqual({
      status: "updated",
      email: "superadmin@example.com"
    });
  });

  it("returns unchanged when the admin already matches the env credentials", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findByEmail.mockResolvedValue(makeAdminUser());
    const ensureSuperAdmin = new EnsureSuperAdmin(
      authenticationRepository,
      new SuperAdminRepositoryDouble(),
      new PasswordHasherDouble()
    );

    const result = await ensureSuperAdmin.execute({
      email: "superadmin@example.com",
      password: "Password123"
    });

    expect(result).toEqual({
      status: "unchanged",
      email: "superadmin@example.com"
    });
  });

  it("throws when only one env credential is provided", async () => {
    const ensureSuperAdmin = new EnsureSuperAdmin(
      new AuthenticationRepositoryDouble(),
      new SuperAdminRepositoryDouble(),
      new PasswordHasherDouble()
    );

    await expect(
      ensureSuperAdmin.execute({
        email: "superadmin@example.com"
      })
    ).rejects.toBeInstanceOf(EnsureSuperAdminError);
  });

  it("throws when the configured email belongs to a non-admin user", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findByEmail.mockResolvedValue(
      makeAdminUser({
        role: "buyer"
      })
    );
    const ensureSuperAdmin = new EnsureSuperAdmin(
      authenticationRepository,
      new SuperAdminRepositoryDouble(),
      new PasswordHasherDouble()
    );

    await expect(
      ensureSuperAdmin.execute({
        email: "superadmin@example.com",
        password: "Password123"
      })
    ).rejects.toBeInstanceOf(EnsureSuperAdminError);
  });
});
