import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CreatePlatformShippingZoneRuleInput,
  ShippingZoneRuleRepository,
  UpdatePlatformShippingZoneRuleInput,
  UpdatePlatformShippingZoneRuleStatusInput
} from "../../../ports/shipping/shipping-zone-rule-repository";
import type {
  ShippingMethodType,
  ShippingRuleStatus,
  ShippingZoneRuleDetailRecord
} from "../../../ports/shipping/shipping-models";

interface ShippingZoneRuleRow {
  id: string;
  zoneId: string;
  ownerType: "platform";
  ownerId: null;
  methodType: ShippingMethodType;
  value: string;
  status: ShippingRuleStatus;
  createdAt: Date;
  updatedAt: Date;
  zoneName: string;
}

export class PostgresShippingZoneRuleRepository
  implements ShippingZoneRuleRepository
{
  constructor(private readonly pool: Pool = databasePool) {}

  async createPlatform(
    input: CreatePlatformShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    const result = await this.pool.query<ShippingZoneRuleRow>(
      `
        INSERT INTO "ShippingZoneRule" (
          "zoneId",
          "ownerType",
          "ownerId",
          "methodType",
          "value",
          "status"
        )
        VALUES ($1, 'platform', NULL, $2, $3, 'active')
        RETURNING
          "id",
          "zoneId",
          "ownerType",
          "ownerId",
          "methodType",
          "value",
          "status",
          "createdAt",
          "updatedAt"
      `,
      [input.zoneId, input.methodType, input.value]
    );

    return this.findPlatformById(result.rows[0].id).then((rule) => {
      if (!rule) {
        throw new Error(
          "Platform shipping zone rule was created but could not be loaded."
        );
      }

      return rule;
    });
  }

  async findAllPlatform(): Promise<ShippingZoneRuleDetailRecord[]> {
    const result = await this.pool.query<ShippingZoneRuleRow>(
      `
        SELECT
          rule."id",
          rule."zoneId",
          rule."ownerType",
          rule."ownerId",
          rule."methodType",
          rule."value",
          rule."status",
          rule."createdAt",
          rule."updatedAt",
          zone."name" AS "zoneName"
        FROM "ShippingZoneRule" rule
        INNER JOIN "ShippingZone" zone
          ON zone."id" = rule."zoneId"
        WHERE rule."ownerType" = 'platform'
          AND rule."ownerId" IS NULL
        ORDER BY zone."name" ASC
      `
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async findPlatformById(
    ruleId: string
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    const result = await this.pool.query<ShippingZoneRuleRow>(
      `
        SELECT
          rule."id",
          rule."zoneId",
          rule."ownerType",
          rule."ownerId",
          rule."methodType",
          rule."value",
          rule."status",
          rule."createdAt",
          rule."updatedAt",
          zone."name" AS "zoneName"
        FROM "ShippingZoneRule" rule
        INNER JOIN "ShippingZone" zone
          ON zone."id" = rule."zoneId"
        WHERE rule."id" = $1
          AND rule."ownerType" = 'platform'
          AND rule."ownerId" IS NULL
        LIMIT 1
      `,
      [ruleId]
    );

    const row = result.rows[0];

    return row ? this.mapRow(row) : null;
  }

  async findPlatformByZoneId(
    zoneId: string
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    const result = await this.pool.query<ShippingZoneRuleRow>(
      `
        SELECT
          rule."id",
          rule."zoneId",
          rule."ownerType",
          rule."ownerId",
          rule."methodType",
          rule."value",
          rule."status",
          rule."createdAt",
          rule."updatedAt",
          zone."name" AS "zoneName"
        FROM "ShippingZoneRule" rule
        INNER JOIN "ShippingZone" zone
          ON zone."id" = rule."zoneId"
        WHERE rule."zoneId" = $1
          AND rule."ownerType" = 'platform'
          AND rule."ownerId" IS NULL
        LIMIT 1
      `,
      [zoneId]
    );

    const row = result.rows[0];

    return row ? this.mapRow(row) : null;
  }

  async updatePlatform(
    input: UpdatePlatformShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    const result = await this.pool.query<ShippingZoneRuleRow>(
      `
        UPDATE "ShippingZoneRule"
        SET
          "zoneId" = COALESCE($2, "zoneId"),
          "methodType" = COALESCE($3, "methodType"),
          "value" = COALESCE($4, "value"),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
          AND "ownerType" = 'platform'
          AND "ownerId" IS NULL
        RETURNING
          "id",
          "zoneId",
          "ownerType",
          "ownerId",
          "methodType",
          "value",
          "status",
          "createdAt",
          "updatedAt"
      `,
      [input.ruleId, input.zoneId, input.methodType, input.value]
    );

    const ruleId = result.rows[0]?.id;

    if (!ruleId) {
      return null;
    }

    return this.findPlatformById(ruleId);
  }

  async updatePlatformStatus(
    input: UpdatePlatformShippingZoneRuleStatusInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    const result = await this.pool.query<ShippingZoneRuleRow>(
      `
        UPDATE "ShippingZoneRule"
        SET
          "status" = $2,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
          AND "ownerType" = 'platform'
          AND "ownerId" IS NULL
        RETURNING
          "id",
          "zoneId",
          "ownerType",
          "ownerId",
          "methodType",
          "value",
          "status",
          "createdAt",
          "updatedAt"
      `,
      [input.ruleId, input.status]
    );

    const ruleId = result.rows[0]?.id;

    if (!ruleId) {
      return null;
    }

    return this.findPlatformById(ruleId);
  }

  private mapRow(row: ShippingZoneRuleRow): ShippingZoneRuleDetailRecord {
    return {
      id: row.id,
      zoneId: row.zoneId,
      ownerType: row.ownerType,
      ownerId: row.ownerId,
      methodType: row.methodType,
      value: Number(row.value),
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      zoneName: row.zoneName
    };
  }
}
