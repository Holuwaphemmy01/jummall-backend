import type { Pool } from "pg";

import databasePool from "../client";
import type {
  BillingAddressRecord,
  BillingAddressRepository,
  CreateBillingAddressInput
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
}
