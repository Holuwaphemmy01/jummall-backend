import type { Pool, PoolClient } from "pg";

import databasePool from "../client";
import type {
  CreateSellerInput,
  ExistingSellerIdentifiers,
  FindExistingSellerIdentifiersInput,
  SellerRecord,
  SellerRepository
} from "../../../ports/seller-repository";

interface ExistingIdentifierRow {
  email: string;
  username: string | null;
  phone: string | null;
}

interface SellerUserRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string;
  phone: string | null;
  role: string;
  accountStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

interface KycRow {
  sellerType: "individual" | "business";
  status: string;
}

export class PostgresSellerRepository implements SellerRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async findExistingIdentifiers(
    input: FindExistingSellerIdentifiersInput
  ): Promise<ExistingSellerIdentifiers> {
    const result = await this.pool.query<ExistingIdentifierRow>(
      `
        SELECT "email", "username", "phone"
        FROM "User"
        WHERE "email" = $1 OR "username" = $2 OR "phone" = $3
      `,
      [input.email, input.username, input.phone]
    );

    return {
      email: result.rows.some((user) => user.email === input.email),
      username: result.rows.some((user) => user.username === input.username),
      phone: result.rows.some((user) => user.phone === input.phone)
    };
  }

  async createSeller(input: CreateSellerInput): Promise<SellerRecord> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const seller = await this.insertSeller(client, input);
      const kyc = await this.insertKyc(client, seller.id, input.accountType);

      if (
        !seller ||
        !seller.firstName ||
        !seller.lastName ||
        !seller.username ||
        !seller.phone ||
        !kyc
      ) {
        throw new Error("Seller profile fields were not persisted correctly.");
      }

      await client.query("COMMIT");

      return {
        id: seller.id,
        firstName: seller.firstName,
        lastName: seller.lastName,
        username: seller.username,
        email: seller.email,
        phone: seller.phone,
        role: seller.role,
        accountStatus: seller.accountStatus,
        accountType: kyc.sellerType,
        kycStatus: kyc.status,
        createdAt: seller.createdAt,
        updatedAt: seller.updatedAt
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertSeller(
    client: PoolClient,
    input: CreateSellerInput
  ): Promise<SellerUserRow> {
    const result = await client.query<SellerUserRow>(
      `
        INSERT INTO "User" (
          "firstName",
          "lastName",
          "username",
          "email",
          "phone",
          "password",
          "role",
          "accountStatus"
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'seller', 'not_verified')
        RETURNING
          "id",
          "firstName",
          "lastName",
          "username",
          "email",
          "phone",
          "role",
          "accountStatus",
          "createdAt",
          "updatedAt"
      `,
      [
        input.firstName,
        input.lastName,
        input.username,
        input.email,
        input.phone,
        input.passwordHash
      ]
    );

    return result.rows[0];
  }

  private async insertKyc(
    client: PoolClient,
    userId: string,
    accountType: "individual" | "business"
  ): Promise<KycRow> {
    const result = await client.query<KycRow>(
      `
        INSERT INTO "Kyc" ("userId", "sellerType", "status")
        VALUES ($1, $2, 'not_started')
        RETURNING "sellerType", "status"
      `,
      [userId, accountType]
    );

    return result.rows[0];
  }
}
