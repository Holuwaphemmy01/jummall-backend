import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CreateRefreshTokenSessionInput,
  RefreshTokenSession,
  RefreshTokenSessionRepository,
  RevokeRefreshTokenSessionInput,
  RotateRefreshTokenSessionInput
} from "../../../ports/refresh-token-session-repository";

interface RefreshTokenSessionRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapRowToSession(row: RefreshTokenSessionRow): RefreshTokenSession {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class PostgresRefreshTokenSessionRepository
  implements RefreshTokenSessionRepository
{
  constructor(private readonly pool: Pool = databasePool) {}

  async create(
    input: CreateRefreshTokenSessionInput
  ): Promise<RefreshTokenSession> {
    const result = await this.pool.query<RefreshTokenSessionRow>(
      `
        INSERT INTO "RefreshTokenSession" (
          "userId",
          "tokenHash",
          "expiresAt"
        )
        VALUES ($1, $2, $3)
        RETURNING
          "id",
          "userId",
          "tokenHash",
          "expiresAt",
          "revokedAt",
          "createdAt",
          "updatedAt"
      `,
      [input.userId, input.tokenHash, input.expiresAt]
    );

    return mapRowToSession(result.rows[0]);
  }

  async findActiveByTokenHash(tokenHash: string): Promise<RefreshTokenSession | null> {
    const result = await this.pool.query<RefreshTokenSessionRow>(
      `
        SELECT
          "id",
          "userId",
          "tokenHash",
          "expiresAt",
          "revokedAt",
          "createdAt",
          "updatedAt"
        FROM "RefreshTokenSession"
        WHERE "tokenHash" = $1
          AND "revokedAt" IS NULL
          AND "expiresAt" > CURRENT_TIMESTAMP
        LIMIT 1
      `,
      [tokenHash]
    );

    const row = result.rows[0];

    return row ? mapRowToSession(row) : null;
  }

  async rotate(input: RotateRefreshTokenSessionInput): Promise<void> {
    await this.pool.query(
      `
        UPDATE "RefreshTokenSession"
        SET
          "tokenHash" = $2,
          "expiresAt" = $3,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
      `,
      [input.sessionId, input.tokenHash, input.expiresAt]
    );
  }

  async revoke(input: RevokeRefreshTokenSessionInput): Promise<void> {
    await this.pool.query(
      `
        UPDATE "RefreshTokenSession"
        SET
          "revokedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
          AND "userId" = $2
          AND "revokedAt" IS NULL
      `,
      [input.sessionId, input.userId]
    );
  }
}
