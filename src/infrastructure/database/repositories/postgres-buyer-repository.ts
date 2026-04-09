import type { Pool } from "pg";

import databasePool from "../client";
import type {
  BuyerRecord,
  BuyerRepository,
  CreateBuyerInput,
  ExistingBuyerIdentifiers,
  FindExistingBuyerIdentifiersInput,
  FindExistingBuyerPhoneByAnotherUserInput,
  UpdateBuyerProfileInput
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

  async isPhoneInUseByAnotherUser(
    input: FindExistingBuyerPhoneByAnotherUserInput
  ): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM "User"
          WHERE "phone" = $1 AND "id" <> $2
        ) AS "exists"
      `,
      [input.phone, input.buyerId]
    );

    return result.rows[0]?.exists ?? false;
  }

  async updateBuyerProfile(
    input: UpdateBuyerProfileInput
  ): Promise<BuyerRecord | null> {
    const assignments: string[] = [];
    const values: string[] = [];

    if (input.firstName !== undefined) {
      values.push(input.firstName);
      assignments.push(`"firstName" = $${values.length}`);
    }

    if (input.lastName !== undefined) {
      values.push(input.lastName);
      assignments.push(`"lastName" = $${values.length}`);
    }

    if (input.phone !== undefined) {
      values.push(input.phone);
      assignments.push(`"phone" = $${values.length}`);
    }

    if (assignments.length === 0) {
      return null;
    }

    values.push(input.buyerId);
    const buyerIdParameter = values.length;

    const result = await this.pool.query<BuyerRow>(
      `
        UPDATE "User"
        SET
          ${assignments.join(", ")},
          "updatedAt" = NOW()
        WHERE "id" = $${buyerIdParameter} AND "role" = 'buyer'
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
      values
    );

    const buyer = result.rows[0];

    if (
      !buyer ||
      !buyer.firstName ||
      !buyer.lastName ||
      !buyer.username ||
      !buyer.phone
    ) {
      return null;
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
