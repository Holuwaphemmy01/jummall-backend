import type { Pool } from "pg";

import databasePool from "../client";
import type {
  EmailVerificationRecord,
  EmailVerificationRepository,
  SaveEmailVerificationInput
} from "../../../ports/email-verification-repository";

interface EmailVerificationRow {
  userId: string;
  email: string;
  firstName: string | null;
  accountStatus: string;
  code: string;
  expiresAt: Date;
  verifiedAt: Date | null;
}

export class PostgresEmailVerificationRepository
  implements EmailVerificationRepository
{
  constructor(private readonly pool: Pool = databasePool) {}

  async save(input: SaveEmailVerificationInput): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO "EmailVerification" (
          "userId",
          "code",
          "expiresAt",
          "verifiedAt",
          "updatedAt"
        )
        VALUES ($1, $2, $3, NULL, CURRENT_TIMESTAMP)
        ON CONFLICT ("userId")
        DO UPDATE SET
          "code" = EXCLUDED."code",
          "expiresAt" = EXCLUDED."expiresAt",
          "verifiedAt" = NULL,
          "updatedAt" = CURRENT_TIMESTAMP
      `,
      [input.userId, input.code, input.expiresAt]
    );
  }

  async findByEmail(email: string): Promise<EmailVerificationRecord | null> {
    const result = await this.pool.query<EmailVerificationRow>(
      `
        SELECT
          u."id" AS "userId",
          u."email",
          u."firstName",
          u."accountStatus",
          ev."code",
          ev."expiresAt",
          ev."verifiedAt"
        FROM "User" u
        INNER JOIN "EmailVerification" ev ON ev."userId" = u."id"
        WHERE u."email" = $1
        LIMIT 1
      `,
      [email]
    );

    const verification = result.rows[0];

    if (!verification) {
      return null;
    }

    return {
      userId: verification.userId,
      email: verification.email,
      firstName: verification.firstName,
      accountStatus: verification.accountStatus,
      code: verification.code,
      expiresAt: verification.expiresAt,
      verifiedAt: verification.verifiedAt
    };
  }

  async markUserAsVerified(userId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `
          UPDATE "User"
          SET
            "accountStatus" = 'verified',
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $1
        `,
        [userId]
      );
      await client.query(
        `
          UPDATE "EmailVerification"
          SET
            "verifiedAt" = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "userId" = $1
        `,
        [userId]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
