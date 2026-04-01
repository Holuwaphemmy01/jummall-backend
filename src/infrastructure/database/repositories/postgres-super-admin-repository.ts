import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CreateSuperAdminInput,
  MarkUserAsVerifiedInput,
  SuperAdminRepository
} from "../../../ports/super-admin-repository";

export class PostgresSuperAdminRepository implements SuperAdminRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async createSuperAdmin(input: CreateSuperAdminInput): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO "User" (
          "firstName",
          "lastName",
          "email",
          "password",
          "role",
          "accountStatus"
        )
        VALUES ($1, $2, $3, $4, 'admin', 'verified')
      `,
      [
        input.firstName ?? "Super",
        input.lastName ?? "Admin",
        input.email,
        input.passwordHash
      ]
    );
  }

  async markUserAsVerified(input: MarkUserAsVerifiedInput): Promise<void> {
    await this.pool.query(
      `
        UPDATE "User"
        SET
          "accountStatus" = 'verified',
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
      `,
      [input.userId]
    );
  }
}
