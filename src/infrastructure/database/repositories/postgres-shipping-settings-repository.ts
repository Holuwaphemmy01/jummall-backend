import type { Pool } from "pg";

import databasePool from "../client";
import type {
  ShippingSettingsRecord,
  ShippingSettingsRepository,
  UpdateShippingSettingsInput
} from "../../../ports/shipping/shipping-settings-repository";

interface ShippingSettingsRow {
  id: string;
  shippingMode: ShippingSettingsRecord["shippingMode"];
  categoryShippingMode: ShippingSettingsRecord["categoryShippingMode"];
  vendorFallbackPolicy: ShippingSettingsRecord["vendorFallbackPolicy"];
  createdAt: Date;
  updatedAt: Date;
}

export class PostgresShippingSettingsRepository
  implements ShippingSettingsRepository
{
  constructor(private readonly pool: Pool = databasePool) {}

  async get(): Promise<ShippingSettingsRecord | null> {
    const result = await this.pool.query<ShippingSettingsRow>(
      `
        SELECT
          "id",
          "shippingMode",
          "categoryShippingMode",
          "vendorFallbackPolicy",
          "createdAt",
          "updatedAt"
        FROM "ShippingSettings"
        WHERE "id" = 'shipping-settings'
        LIMIT 1
      `
    );

    return result.rows[0] ?? null;
  }

  async update(
    input: UpdateShippingSettingsInput
  ): Promise<ShippingSettingsRecord | null> {
    const result = await this.pool.query<ShippingSettingsRow>(
      `
        UPDATE "ShippingSettings"
        SET
          "shippingMode" = COALESCE($1, "shippingMode"),
          "categoryShippingMode" = COALESCE($2, "categoryShippingMode"),
          "vendorFallbackPolicy" = COALESCE($3, "vendorFallbackPolicy"),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = 'shipping-settings'
        RETURNING
          "id",
          "shippingMode",
          "categoryShippingMode",
          "vendorFallbackPolicy",
          "createdAt",
          "updatedAt"
      `,
      [
        input.shippingMode,
        input.categoryShippingMode,
        input.vendorFallbackPolicy
      ]
    );

    return result.rows[0] ?? null;
  }
}
