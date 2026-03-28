import type { Pool } from "pg";

import databasePool from "../client";
import type {
  PasswordResetRecord,
  PasswordResetRepository,
  SavePasswordResetInput
} from "../../../ports/password-reset-repository";

interface PasswordResetRow {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  code: string;
  status: "active" | "used" | "expired" | "invalidated";
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export class PostgresPasswordResetRepository implements PasswordResetRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async save(input: SavePasswordResetInput): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `
          UPDATE "PasswordReset"
          SET
            "status" = 'invalidated',
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "userId" = $1 AND "status" = 'active'
        `,
        [input.userId]
      );
      await client.query(
        `
          INSERT INTO "PasswordReset" (
            "userId",
            "code",
            "status",
            "expiresAt",
            "usedAt",
            "updatedAt"
          )
          VALUES ($1, $2, 'active', $3, NULL, CURRENT_TIMESTAMP)
        `,
        [input.userId, input.code, input.expiresAt]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findByEmailAndCode(
    email: string,
    code: string
  ): Promise<PasswordResetRecord | null> {
    const result = await this.pool.query<PasswordResetRow>(
      `
        SELECT
          pr."id",
          pr."userId",
          u."email",
          u."firstName",
          pr."code",
          pr."status",
          pr."expiresAt",
          pr."usedAt",
          pr."createdAt"
        FROM "PasswordReset" pr
        INNER JOIN "User" u ON u."id" = pr."userId"
        WHERE u."email" = $1 AND pr."code" = $2
        ORDER BY pr."createdAt" DESC
        LIMIT 1
      `,
      [email, code]
    );

    const passwordReset = result.rows[0];

    if (!passwordReset) {
      return null;
    }

    return passwordReset;
  }

  async markAsUsed(resetId: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE "PasswordReset"
        SET
          "status" = 'used',
          "usedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
      `,
      [resetId]
    );
  }

  async markAsExpired(resetId: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE "PasswordReset"
        SET
          "status" = 'expired',
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1 AND "status" = 'active'
      `,
      [resetId]
    );
  }
}
