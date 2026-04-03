import type { Pool, PoolClient } from "pg";

import databasePool from "../client";
import type {
  CreatePlatformShippingZoneRuleInput,
  CreateVendorShippingZoneRuleInput,
  ShippingZoneRuleRepository,
  UpdatePlatformShippingZoneRuleInput,
  UpdatePlatformShippingZoneRuleStatusInput,
  UpdateVendorShippingZoneRuleInput,
  UpdateVendorShippingZoneRuleStatusInput
} from "../../../ports/shipping/shipping-zone-rule-repository";
import type {
  ShippingMethodType,
  ShippingOwnerType,
  ShippingRuleStatus,
  ShippingSubtotalBandInput,
  ShippingSubtotalBandRecord,
  ShippingZoneRuleDetailRecord
} from "../../../ports/shipping/shipping-models";

interface ShippingZoneRuleRow {
  id: string;
  zoneId: string;
  ownerType: ShippingOwnerType;
  ownerId: string | null;
  methodType: ShippingMethodType;
  value: string;
  status: ShippingRuleStatus;
  createdAt: Date;
  updatedAt: Date;
  zoneName: string;
}

interface ShippingZoneRuleSubtotalBandRow {
  id: string;
  shippingZoneRuleId: string;
  minSubtotal: string;
  maxSubtotal: string | null;
  methodType: ShippingMethodType;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PostgresShippingZoneRuleRepository
  implements ShippingZoneRuleRepository
{
  constructor(private readonly pool: Pool = databasePool) {}

  async createPlatform(
    input: CreatePlatformShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    return this.createOwnedRule({
      ownerType: "platform",
      ownerId: null,
      zoneId: input.zoneId,
      methodType: input.methodType,
      value: input.value,
      subtotalBands: input.subtotalBands ?? []
    });
  }

  async createVendor(
    input: CreateVendorShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    return this.createOwnedRule({
      ownerType: "vendor",
      ownerId: input.ownerId,
      zoneId: input.zoneId,
      methodType: input.methodType,
      value: input.value,
      subtotalBands: input.subtotalBands ?? []
    });
  }

  async findAllPlatform(): Promise<ShippingZoneRuleDetailRecord[]> {
    return this.findAllOwnedRules("platform", null);
  }

  async findAllVendor(ownerId: string): Promise<ShippingZoneRuleDetailRecord[]> {
    return this.findAllOwnedRules("vendor", ownerId);
  }

  async findPlatformById(
    ruleId: string
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return this.findOwnedRuleById("platform", null, ruleId);
  }

  async findVendorById(
    ownerId: string,
    ruleId: string
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return this.findOwnedRuleById("vendor", ownerId, ruleId);
  }

  async findPlatformByZoneId(
    zoneId: string
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return this.findOwnedRuleByZoneId("platform", null, zoneId);
  }

  async findVendorByZoneId(
    ownerId: string,
    zoneId: string
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return this.findOwnedRuleByZoneId("vendor", ownerId, zoneId);
  }

  async updatePlatform(
    input: UpdatePlatformShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return this.updateOwnedRule("platform", null, input);
  }

  async updateVendor(
    input: UpdateVendorShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return this.updateOwnedRule("vendor", input.ownerId, input);
  }

  async updatePlatformStatus(
    input: UpdatePlatformShippingZoneRuleStatusInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return this.updateOwnedRuleStatus("platform", null, input.ruleId, input.status);
  }

  async updateVendorStatus(
    input: UpdateVendorShippingZoneRuleStatusInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return this.updateOwnedRuleStatus(
      "vendor",
      input.ownerId,
      input.ruleId,
      input.status
    );
  }

  private async createOwnedRule(input: {
    ownerType: ShippingOwnerType;
    ownerId: string | null;
    zoneId: string;
    methodType: ShippingMethodType;
    value: number;
    subtotalBands: ShippingSubtotalBandInput[];
  }): Promise<ShippingZoneRuleDetailRecord> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query<{ id: string }>(
        `
          INSERT INTO "ShippingZoneRule" (
            "zoneId",
            "ownerType",
            "ownerId",
            "methodType",
            "value",
            "status"
          )
          VALUES ($1, $2, $3, $4, $5, 'active')
          RETURNING "id"
        `,
        [
          input.zoneId,
          input.ownerType,
          input.ownerId,
          input.methodType,
          input.value
        ]
      );

      const createdRuleId = result.rows[0].id;

      await this.replaceSubtotalBands(client, createdRuleId, input.subtotalBands);

      await client.query("COMMIT");

      const createdRule = await this.findOwnedRuleById(
        input.ownerType,
        input.ownerId,
        createdRuleId
      );

      if (!createdRule) {
        throw new Error("Shipping zone rule was created but could not be loaded.");
      }

      return createdRule;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async findAllOwnedRules(
    ownerType: ShippingOwnerType,
    ownerId: string | null
  ): Promise<ShippingZoneRuleDetailRecord[]> {
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
        WHERE rule."ownerType" = $1
          AND (
            ($2::text IS NULL AND rule."ownerId" IS NULL)
            OR rule."ownerId" = $2
          )
        ORDER BY zone."name" ASC
      `,
      [ownerType, ownerId]
    );

    const subtotalBandsByRuleId = await this.findSubtotalBandsByRuleIds(
      this.pool,
      result.rows.map((row) => row.id)
    );

    return result.rows.map((row) =>
      this.mapRow(row, subtotalBandsByRuleId.get(row.id) ?? [])
    );
  }

  private async findOwnedRuleById(
    ownerType: ShippingOwnerType,
    ownerId: string | null,
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
        WHERE rule."id" = $3
          AND rule."ownerType" = $1
          AND (
            ($2::text IS NULL AND rule."ownerId" IS NULL)
            OR rule."ownerId" = $2
          )
        LIMIT 1
      `,
      [ownerType, ownerId, ruleId]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    const subtotalBandsByRuleId = await this.findSubtotalBandsByRuleIds(this.pool, [
      row.id
    ]);

    return this.mapRow(row, subtotalBandsByRuleId.get(row.id) ?? []);
  }

  private async findOwnedRuleByZoneId(
    ownerType: ShippingOwnerType,
    ownerId: string | null,
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
        WHERE rule."zoneId" = $3
          AND rule."ownerType" = $1
          AND (
            ($2::text IS NULL AND rule."ownerId" IS NULL)
            OR rule."ownerId" = $2
          )
        LIMIT 1
      `,
      [ownerType, ownerId, zoneId]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    const subtotalBandsByRuleId = await this.findSubtotalBandsByRuleIds(this.pool, [
      row.id
    ]);

    return this.mapRow(row, subtotalBandsByRuleId.get(row.id) ?? []);
  }

  private async updateOwnedRule(
    ownerType: ShippingOwnerType,
    ownerId: string | null,
    input:
      | UpdatePlatformShippingZoneRuleInput
      | UpdateVendorShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query<{ id: string }>(
        `
          UPDATE "ShippingZoneRule"
          SET
            "zoneId" = COALESCE($4, "zoneId"),
            "methodType" = COALESCE($5, "methodType"),
            "value" = COALESCE($6, "value"),
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $3
            AND "ownerType" = $1
            AND (
              ($2::text IS NULL AND "ownerId" IS NULL)
              OR "ownerId" = $2
            )
          RETURNING "id"
        `,
        [
          ownerType,
          ownerId,
          input.ruleId,
          input.zoneId,
          input.methodType,
          input.value
        ]
      );

      const updatedRuleId = result.rows[0]?.id;

      if (!updatedRuleId) {
        await client.query("ROLLBACK");
        return null;
      }

      if (input.subtotalBands !== undefined) {
        await this.replaceSubtotalBands(client, updatedRuleId, input.subtotalBands);
      }

      await client.query("COMMIT");

      return this.findOwnedRuleById(ownerType, ownerId, updatedRuleId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async updateOwnedRuleStatus(
    ownerType: ShippingOwnerType,
    ownerId: string | null,
    ruleId: string,
    status: ShippingRuleStatus
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    const result = await this.pool.query<{ id: string }>(
      `
        UPDATE "ShippingZoneRule"
        SET
          "status" = $4,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $3
          AND "ownerType" = $1
          AND (
            ($2::text IS NULL AND "ownerId" IS NULL)
            OR "ownerId" = $2
          )
        RETURNING "id"
      `,
      [ownerType, ownerId, ruleId, status]
    );

    const updatedRuleId = result.rows[0]?.id;

    if (!updatedRuleId) {
      return null;
    }

    return this.findOwnedRuleById(ownerType, ownerId, updatedRuleId);
  }

  private async replaceSubtotalBands(
    client: PoolClient,
    ruleId: string,
    subtotalBands: ShippingSubtotalBandInput[]
  ) {
    await client.query(
      `
        DELETE FROM "ShippingZoneRuleSubtotalBand"
        WHERE "shippingZoneRuleId" = $1
      `,
      [ruleId]
    );

    for (const subtotalBand of subtotalBands) {
      await client.query(
        `
          INSERT INTO "ShippingZoneRuleSubtotalBand" (
            "shippingZoneRuleId",
            "minSubtotal",
            "maxSubtotal",
            "methodType",
            "value"
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          ruleId,
          subtotalBand.minSubtotal,
          subtotalBand.maxSubtotal,
          subtotalBand.methodType,
          subtotalBand.value
        ]
      );
    }
  }

  private async findSubtotalBandsByRuleIds(
    executor: Pool | PoolClient,
    ruleIds: string[]
  ): Promise<Map<string, ShippingSubtotalBandRecord[]>> {
    const subtotalBandsByRuleId = new Map<string, ShippingSubtotalBandRecord[]>();

    if (ruleIds.length === 0) {
      return subtotalBandsByRuleId;
    }

    const result = await executor.query<ShippingZoneRuleSubtotalBandRow>(
      `
        SELECT
          band."id",
          band."shippingZoneRuleId",
          band."minSubtotal",
          band."maxSubtotal",
          band."methodType",
          band."value",
          band."createdAt",
          band."updatedAt"
        FROM "ShippingZoneRuleSubtotalBand" band
        WHERE band."shippingZoneRuleId" = ANY($1::text[])
        ORDER BY band."minSubtotal" ASC, band."createdAt" ASC
      `,
      [ruleIds]
    );

    for (const row of result.rows) {
      const subtotalBands = subtotalBandsByRuleId.get(row.shippingZoneRuleId) ?? [];

      subtotalBands.push({
        id: row.id,
        minSubtotal: Number(row.minSubtotal),
        maxSubtotal:
          row.maxSubtotal === null ? null : Number(row.maxSubtotal),
        methodType: row.methodType,
        value: Number(row.value),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      });

      subtotalBandsByRuleId.set(row.shippingZoneRuleId, subtotalBands);
    }

    return subtotalBandsByRuleId;
  }

  private mapRow(
    row: ShippingZoneRuleRow,
    subtotalBands: ShippingSubtotalBandRecord[]
  ): ShippingZoneRuleDetailRecord {
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
      zoneName: row.zoneName,
      subtotalBands
    };
  }
}
