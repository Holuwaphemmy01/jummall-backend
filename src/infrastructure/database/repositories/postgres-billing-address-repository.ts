import type { Pool } from "pg";

import databasePool from "../client";
import type {
  BillingAddressRecord,
  BillingAddressRepository,
  CreateBillingAddressInput,
  UpdateBillingAddressInput
} from "../../../ports/billing-address-repository";

interface BillingAddressRow {
  id: string;
  buyerId: string;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PostgresBillingAddressRepository
  implements BillingAddressRepository
{
  constructor(private readonly pool: Pool = databasePool) {}

  async findByIdAndBuyerId(
    billingAddressId: string,
    buyerId: string
  ): Promise<BillingAddressRecord | null> {
    const result = await this.pool.query<BillingAddressRow>(
      `
        SELECT
          "id",
          "buyerId",
          "fullName",
          "phoneNumber",
          "addressLine1",
          "addressLine2",
          "city",
          "state",
          "country",
          "postalCode",
          "createdAt",
          "updatedAt"
        FROM "BillingAddress"
        WHERE "id" = $1 AND "buyerId" = $2
        LIMIT 1
      `,
      [billingAddressId, buyerId]
    );

    return result.rows[0] ?? null;
  }

  async findByBuyerId(buyerId: string): Promise<BillingAddressRecord[]> {
    const result = await this.pool.query<BillingAddressRow>(
      `
        SELECT
          "id",
          "buyerId",
          "fullName",
          "phoneNumber",
          "addressLine1",
          "addressLine2",
          "city",
          "state",
          "country",
          "postalCode",
          "createdAt",
          "updatedAt"
        FROM "BillingAddress"
        WHERE "buyerId" = $1
        ORDER BY "createdAt" DESC
      `,
      [buyerId]
    );

    return result.rows;
  }

  async deleteByIdAndBuyerId(
    billingAddressId: string,
    buyerId: string
  ): Promise<BillingAddressRecord | null> {
    const result = await this.pool.query<BillingAddressRow>(
      `
        DELETE FROM "BillingAddress"
        WHERE "id" = $1 AND "buyerId" = $2
        RETURNING
          "id",
          "buyerId",
          "fullName",
          "phoneNumber",
          "addressLine1",
          "addressLine2",
          "city",
          "state",
          "country",
          "postalCode",
          "createdAt",
          "updatedAt"
      `,
      [billingAddressId, buyerId]
    );

    return result.rows[0] ?? null;
  }

  async create(input: CreateBillingAddressInput): Promise<BillingAddressRecord> {
    const result = await this.pool.query<BillingAddressRow>(
      `
        INSERT INTO "BillingAddress" (
          "buyerId",
          "fullName",
          "phoneNumber",
          "addressLine1",
          "addressLine2",
          "city",
          "state",
          "country",
          "postalCode"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
          "id",
          "buyerId",
          "fullName",
          "phoneNumber",
          "addressLine1",
          "addressLine2",
          "city",
          "state",
          "country",
          "postalCode",
          "createdAt",
          "updatedAt"
      `,
      [
        input.buyerId,
        input.fullName,
        input.phoneNumber,
        input.addressLine1,
        input.addressLine2 ?? null,
        input.city,
        input.state,
        input.country,
        input.postalCode ?? null
      ]
    );

    return result.rows[0];
  }

  async update(input: UpdateBillingAddressInput): Promise<BillingAddressRecord | null> {
    const assignments: string[] = [];
    const values: Array<string | null> = [];

    if (input.fullName !== undefined) {
      values.push(input.fullName);
      assignments.push(`"fullName" = $${values.length}`);
    }

    if (input.phoneNumber !== undefined) {
      values.push(input.phoneNumber);
      assignments.push(`"phoneNumber" = $${values.length}`);
    }

    if (input.addressLine1 !== undefined) {
      values.push(input.addressLine1);
      assignments.push(`"addressLine1" = $${values.length}`);
    }

    if (input.addressLine2 !== undefined) {
      values.push(input.addressLine2);
      assignments.push(`"addressLine2" = $${values.length}`);
    }

    if (input.city !== undefined) {
      values.push(input.city);
      assignments.push(`"city" = $${values.length}`);
    }

    if (input.state !== undefined) {
      values.push(input.state);
      assignments.push(`"state" = $${values.length}`);
    }

    if (input.country !== undefined) {
      values.push(input.country);
      assignments.push(`"country" = $${values.length}`);
    }

    if (input.postalCode !== undefined) {
      values.push(input.postalCode);
      assignments.push(`"postalCode" = $${values.length}`);
    }

    if (assignments.length === 0) {
      return this.findByIdAndBuyerId(input.billingAddressId, input.buyerId);
    }

    values.push(input.billingAddressId);
    const billingAddressIdParameter = values.length;
    values.push(input.buyerId);
    const buyerIdParameter = values.length;

    const result = await this.pool.query<BillingAddressRow>(
      `
        UPDATE "BillingAddress"
        SET
          ${assignments.join(", ")},
          "updatedAt" = NOW()
        WHERE "id" = $${billingAddressIdParameter} AND "buyerId" = $${buyerIdParameter}
        RETURNING
          "id",
          "buyerId",
          "fullName",
          "phoneNumber",
          "addressLine1",
          "addressLine2",
          "city",
          "state",
          "country",
          "postalCode",
          "createdAt",
          "updatedAt"
      `,
      values
    );

    return result.rows[0] ?? null;
  }
}
