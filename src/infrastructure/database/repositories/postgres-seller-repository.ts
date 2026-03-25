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
  phone: string | null;
}

interface SellerUserRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: string;
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
        SELECT "email", "phone"
        FROM "User"
        WHERE "email" = $1 OR "phone" = $2
      `,
      [input.email, input.phone]
    );

    return {
      email: result.rows.some((user) => user.email === input.email),
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
        email: seller.email,
        phone: seller.phone,
        role: seller.role,
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
          "email",
          "phone",
          "password",
          "role"
        )
        VALUES ($1, $2, $3, $4, $5, 'seller')
        RETURNING
          "id",
          "firstName",
          "lastName",
          "email",
          "phone",
          "role",
          "createdAt",
          "updatedAt"
      `,
      [
        input.firstName,
        input.lastName,
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
