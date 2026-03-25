import type { Pool } from "pg";

import databasePool from "../client";
import type {
  EmailVerificationRecord,
  EmailVerificationRepository,
  SaveEmailVerificationInput
} from "../../../ports/email-verification-repository";

interface EmailVerificationRow {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  accountStatus: string;
  code: string;
  status: string;
  expiresAt: Date;
  verifiedAt: Date | null;
  createdAt: Date;
}

export class PostgresEmailVerificationRepository
  implements EmailVerificationRepository
{
  constructor(private readonly pool: Pool = databasePool) {}

  async save(input: SaveEmailVerificationInput): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `
          UPDATE "EmailVerification"
          SET
            "status" = 'invalidated',
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "userId" = $1 AND "status" = 'active'
        `,
        [input.userId]
      );
      await client.query(
        `
          INSERT INTO "EmailVerification" (
            "userId",
            "code",
            "status",
            "expiresAt",
            "verifiedAt",
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

  async findByEmail(email: string): Promise<EmailVerificationRecord | null> {
    const result = await this.pool.query<EmailVerificationRow>(
      `
        SELECT
          u."id" AS "userId",
          u."email",
          u."firstName",
          u."accountStatus",
          ev."id",
          ev."code",
          ev."status",
          ev."expiresAt",
          ev."verifiedAt"
          ,ev."createdAt"
        FROM "User" u
        INNER JOIN "EmailVerification" ev ON ev."userId" = u."id"
        WHERE u."email" = $1
        ORDER BY ev."createdAt" DESC
        LIMIT 1
      `,
      [email]
    );

    const verification = result.rows[0];

    if (!verification) {
      return null;
    }

    return {
      id: verification.id,
      userId: verification.userId,
      email: verification.email,
      firstName: verification.firstName,
      accountStatus: verification.accountStatus,
      code: verification.code,
      status: verification.status,
      expiresAt: verification.expiresAt,
      verifiedAt: verification.verifiedAt,
      createdAt: verification.createdAt
    };
  }

  async markVerificationAsUsed(input: {
    verificationId: string;
    userId: string;
  }): Promise<void> {
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
        [input.userId]
      );
      await client.query(
        `
          UPDATE "EmailVerification"
          SET
            "status" = 'used',
            "verifiedAt" = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $1
        `,
        [input.verificationId]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async markVerificationAsExpired(verificationId: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE "EmailVerification"
        SET
          "status" = 'expired',
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1 AND "status" = 'active'
      `,
      [verificationId]
    );
  }
}
