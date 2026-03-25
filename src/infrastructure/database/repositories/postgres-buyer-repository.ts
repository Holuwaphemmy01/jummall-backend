import type { Pool } from "pg";

import databasePool from "../client";
import type {
  BuyerRecord,
  BuyerRepository,
  CreateBuyerInput,
  ExistingBuyerIdentifiers,
  FindExistingBuyerIdentifiersInput
} from "../../../ports/buyer-repository";

interface ExistingIdentifierRow {
  email: string;
  username: string | null;
  phone: string | null;
}

interface BuyerRow {
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

export class PostgresBuyerRepository implements BuyerRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async findExistingIdentifiers(
    input: FindExistingBuyerIdentifiersInput
  ): Promise<ExistingBuyerIdentifiers> {
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

  async createBuyer(input: CreateBuyerInput): Promise<BuyerRecord> {
    const result = await this.pool.query<BuyerRow>(
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
        VALUES ($1, $2, $3, $4, $5, $6, 'buyer', 'not_verified')
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

    const buyer = result.rows[0];

    if (
      !buyer ||
      !buyer.firstName ||
      !buyer.lastName ||
      !buyer.username ||
      !buyer.phone
    ) {
      throw new Error("Buyer profile fields were not persisted correctly.");
    }

    return {
      id: buyer.id,
      firstName: buyer.firstName,
      lastName: buyer.lastName,
      username: buyer.username,
      email: buyer.email,
      phone: buyer.phone,
      role: buyer.role,
      accountStatus: buyer.accountStatus,
      createdAt: buyer.createdAt,
      updatedAt: buyer.updatedAt
    };
  }
}
