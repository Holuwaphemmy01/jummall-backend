import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CreateFreeShippingRuleInput,
  FreeShippingRuleRepository,
  UpdateFreeShippingRuleInput,
  UpdateFreeShippingRuleStatusInput
} from "../../../ports/shipping/free-shipping-rule-repository";
import type {
  FreeShippingRuleRecord,
  FreeShippingRuleStatus,
  FreeShippingRuleType
} from "../../../ports/shipping/shipping-models";

interface FreeShippingRuleRow {
  id: string;
  name: string;
  type: FreeShippingRuleType;
  couponCode: string | null;
  minimumOrderSubtotal: string | null;
  status: FreeShippingRuleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class PostgresFreeShippingRuleRepository
  implements FreeShippingRuleRepository
{
  constructor(private readonly pool: Pool = databasePool) {}

  async create(
    input: CreateFreeShippingRuleInput
  ): Promise<FreeShippingRuleRecord> {
    const result = await this.pool.query<FreeShippingRuleRow>(
      `
        INSERT INTO "FreeShippingRule" (
          "name",
          "type",
          "couponCode",
          "minimumOrderSubtotal",
          "status"
        )
        VALUES ($1, $2, $3, $4, 'active')
        RETURNING
          "id",
          "name",
          "type",
          "couponCode",
          "minimumOrderSubtotal",
          "status",
          "createdAt",
          "updatedAt"
      `,
      [
        input.name,
        input.type,
        input.couponCode,
        input.minimumOrderSubtotal
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  async findAll(): Promise<FreeShippingRuleRecord[]> {
    const result = await this.pool.query<FreeShippingRuleRow>(
      `
        SELECT
          "id",
          "name",
          "type",
          "couponCode",
          "minimumOrderSubtotal",
          "status",
          "createdAt",
          "updatedAt"
        FROM "FreeShippingRule"
        ORDER BY "createdAt" DESC
      `
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async findById(ruleId: string): Promise<FreeShippingRuleRecord | null> {
    const result = await this.pool.query<FreeShippingRuleRow>(
      `
        SELECT
          "id",
          "name",
          "type",
          "couponCode",
          "minimumOrderSubtotal",
          "status",
          "createdAt",
          "updatedAt"
        FROM "FreeShippingRule"
        WHERE "id" = $1
        LIMIT 1
      `,
      [ruleId]
    );

    const row = result.rows[0];
    return row ? this.mapRow(row) : null;
  }

  async findByCouponCode(
    couponCode: string
  ): Promise<FreeShippingRuleRecord | null> {
    const result = await this.pool.query<FreeShippingRuleRow>(
      `
        SELECT
          "id",
          "name",
          "type",
          "couponCode",
          "minimumOrderSubtotal",
          "status",
          "createdAt",
          "updatedAt"
        FROM "FreeShippingRule"
        WHERE LOWER("couponCode") = LOWER($1)
        LIMIT 1
      `,
      [couponCode]
    );

    const row = result.rows[0];
    return row ? this.mapRow(row) : null;
  }

  async findActiveThresholdRule(): Promise<FreeShippingRuleRecord | null> {
    const result = await this.pool.query<FreeShippingRuleRow>(
      `
        SELECT
          "id",
          "name",
          "type",
          "couponCode",
          "minimumOrderSubtotal",
          "status",
          "createdAt",
          "updatedAt"
        FROM "FreeShippingRule"
        WHERE "type" = 'threshold'
          AND "status" = 'active'
        LIMIT 1
      `
    );

    const row = result.rows[0];
    return row ? this.mapRow(row) : null;
  }

  async update(
    input: UpdateFreeShippingRuleInput
  ): Promise<FreeShippingRuleRecord | null> {
    const result = await this.pool.query<FreeShippingRuleRow>(
      `
        UPDATE "FreeShippingRule"
        SET
          "name" = COALESCE($2, "name"),
          "type" = COALESCE($3, "type"),
          "couponCode" = $4,
          "minimumOrderSubtotal" = $5,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING
          "id",
          "name",
          "type",
          "couponCode",
          "minimumOrderSubtotal",
          "status",
          "createdAt",
          "updatedAt"
      `,
      [
        input.ruleId,
        input.name ?? null,
        input.type ?? null,
        input.couponCode ?? null,
        input.minimumOrderSubtotal ?? null
      ]
    );

    const row = result.rows[0];
    return row ? this.mapRow(row) : null;
  }

  async updateStatus(
    input: UpdateFreeShippingRuleStatusInput
  ): Promise<FreeShippingRuleRecord | null> {
    const result = await this.pool.query<FreeShippingRuleRow>(
      `
        UPDATE "FreeShippingRule"
        SET
          "status" = $2,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING
          "id",
          "name",
          "type",
          "couponCode",
          "minimumOrderSubtotal",
          "status",
          "createdAt",
          "updatedAt"
      `,
      [input.ruleId, input.status]
    );

    const row = result.rows[0];
    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: FreeShippingRuleRow): FreeShippingRuleRecord {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      couponCode: row.couponCode,
      minimumOrderSubtotal:
        row.minimumOrderSubtotal === null
          ? null
          : Number(row.minimumOrderSubtotal),
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}
