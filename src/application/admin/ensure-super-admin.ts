import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { PasswordHasher } from "../../ports/password-hasher";
import type { SuperAdminRepository } from "../../ports/super-admin-repository";

export interface EnsureSuperAdminInput {
  email?: string;
  password?: string;
}

export interface EnsureSuperAdminResult {
  status: "skipped" | "created" | "updated" | "unchanged";
  email: string | null;
}

export class EnsureSuperAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnsureSuperAdminError";
  }
}

export class EnsureSuperAdmin {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly superAdminRepository: SuperAdminRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async execute(
    input: EnsureSuperAdminInput
  ): Promise<EnsureSuperAdminResult> {
    const email = input.email?.trim() ?? "";
    const password = input.password?.trim() ?? "";

    if (!email && !password) {
      return {
        status: "skipped",
        email: null
      };
    }

    if (!email || !password) {
      throw new EnsureSuperAdminError(
        "SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must both be set."
      );
    }

    const existingUser = await this.authenticationRepository.findByEmail(email);

    if (!existingUser) {
      const passwordHash = await this.passwordHasher.hash(password);

      await this.superAdminRepository.createSuperAdmin({
        email,
        passwordHash
      });

      return {
        status: "created",
        email
      };
    }

    if (existingUser.role !== "admin") {
      throw new EnsureSuperAdminError(
        "SUPER_ADMIN_EMAIL already belongs to a non-admin user."
      );
    }

    let status: "updated" | "unchanged" = "unchanged";

    const passwordMatches = await this.passwordHasher.compare(
      password,
      existingUser.passwordHash
    );

    if (!passwordMatches) {
      const passwordHash = await this.passwordHasher.hash(password);
      await this.authenticationRepository.updatePassword({
        userId: existingUser.id,
        passwordHash
      });
      status = "updated";
    }

    if (existingUser.accountStatus !== "verified") {
      await this.superAdminRepository.markUserAsVerified({
        userId: existingUser.id
      });
      status = "updated";
    }

    return {
      status,
      email
    };
  }
}
