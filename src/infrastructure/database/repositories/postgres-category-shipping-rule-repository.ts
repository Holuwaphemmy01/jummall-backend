import type { Pool, PoolClient } from "pg";

import databasePool from "../client";
import type {
  CategoryShippingRuleRepository,
  CreatePlatformCategoryShippingRuleInput,
  CreateVendorCategoryShippingRuleInput,
  UpdatePlatformCategoryShippingRuleInput,
  UpdatePlatformCategoryShippingRuleStatusInput,
  UpdateVendorCategoryShippingRuleInput,
  UpdateVendorCategoryShippingRuleStatusInput
} from "../../../ports/shipping/category-shipping-rule-repository";
import type {
  CategoryShippingRuleDetailRecord,
  ShippingMethodType,
  ShippingOwnerType,
  ShippingRuleStatus,
  ShippingSubtotalBandInput,
  ShippingSubtotalBandRecord
} from "../../../ports/shipping/shipping-models";

interface CategoryShippingRuleRow {
  id: string;
  categoryId: string;
  ownerType: ShippingOwnerType;
  ownerId: string | null;
  methodType: ShippingMethodType;
  value: string;
  status: ShippingRuleStatus;
  createdAt: Date;
  updatedAt: Date;
  categoryName: string;
}

interface CategoryShippingRuleSubtotalBandRow {
  id: string;
  categoryShippingRuleId: string;
  minSubtotal: string;
  maxSubtotal: string | null;
  methodType: ShippingMethodType;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PostgresCategoryShippingRuleRepository
  implements CategoryShippingRuleRepository
{
  constructor(private readonly pool: Pool = databasePool) {}

  async createPlatform(
    input: CreatePlatformCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord> {
    return this.createOwnedRule({
      ownerType: "platform",
      ownerId: null,
      categoryId: input.categoryId,
      methodType: input.methodType,
      value: input.value,
      subtotalBands: input.subtotalBands ?? []
    });
  }

  async createVendor(
    input: CreateVendorCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord> {
    return this.createOwnedRule({
      ownerType: "vendor",
      ownerId: input.ownerId,
      categoryId: input.categoryId,
      methodType: input.methodType,
      value: input.value,
      subtotalBands: input.subtotalBands ?? []
    });
  }

  async findAllPlatform(): Promise<CategoryShippingRuleDetailRecord[]> {
    return this.findAllOwnedRules("platform", null);
  }

  async findAllVendor(
    ownerId: string
  ): Promise<CategoryShippingRuleDetailRecord[]> {
    return this.findAllOwnedRules("vendor", ownerId);
  }

  async findPlatformById(
    ruleId: string
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    return this.findOwnedRuleById("platform", null, ruleId);
  }

  async findVendorById(
    ownerId: string,
    ruleId: string
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    return this.findOwnedRuleById("vendor", ownerId, ruleId);
  }

  async findPlatformByCategoryId(
    categoryId: string
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    return this.findOwnedRuleByCategoryId("platform", null, categoryId);
  }

  async findVendorByCategoryId(
    ownerId: string,
    categoryId: string
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    return this.findOwnedRuleByCategoryId("vendor", ownerId, categoryId);
  }

  async updatePlatform(
    input: UpdatePlatformCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    return this.updateOwnedRule("platform", null, input);
  }

  async updateVendor(
    input: UpdateVendorCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    return this.updateOwnedRule("vendor", input.ownerId, input);
  }

  async updatePlatformStatus(
    input: UpdatePlatformCategoryShippingRuleStatusInput
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    return this.updateOwnedRuleStatus("platform", null, input.ruleId, input.status);
  }

  async updateVendorStatus(
    input: UpdateVendorCategoryShippingRuleStatusInput
  ): Promise<CategoryShippingRuleDetailRecord | null> {
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
    categoryId: string;
    methodType: ShippingMethodType;
    value: number;
    subtotalBands: ShippingSubtotalBandInput[];
  }): Promise<CategoryShippingRuleDetailRecord> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query<{ id: string }>(
        `
          INSERT INTO "CategoryShippingRule" (
            "categoryId",
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
          input.categoryId,
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
        throw new Error("Category shipping rule was created but could not be loaded.");
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
  ): Promise<CategoryShippingRuleDetailRecord[]> {
    const result = await this.pool.query<CategoryShippingRuleRow>(
      `
        SELECT
          rule."id",
          rule."categoryId",
          rule."ownerType",
          rule."ownerId",
          rule."methodType",
          rule."value",
          rule."status",
          rule."createdAt",
          rule."updatedAt",
          category."name" AS "categoryName"
        FROM "CategoryShippingRule" rule
        INNER JOIN "ProductCategory" category
          ON category."id" = rule."categoryId"
        WHERE rule."ownerType" = $1
          AND (
            ($2::text IS NULL AND rule."ownerId" IS NULL)
            OR rule."ownerId" = $2
          )
        ORDER BY category."name" ASC
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
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    const result = await this.pool.query<CategoryShippingRuleRow>(
      `
        SELECT
          rule."id",
          rule."categoryId",
          rule."ownerType",
          rule."ownerId",
          rule."methodType",
          rule."value",
          rule."status",
          rule."createdAt",
          rule."updatedAt",
          category."name" AS "categoryName"
        FROM "CategoryShippingRule" rule
        INNER JOIN "ProductCategory" category
          ON category."id" = rule."categoryId"
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

  private async findOwnedRuleByCategoryId(
    ownerType: ShippingOwnerType,
    ownerId: string | null,
    categoryId: string
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    const result = await this.pool.query<CategoryShippingRuleRow>(
      `
        SELECT
          rule."id",
          rule."categoryId",
          rule."ownerType",
          rule."ownerId",
          rule."methodType",
          rule."value",
          rule."status",
          rule."createdAt",
          rule."updatedAt",
          category."name" AS "categoryName"
        FROM "CategoryShippingRule" rule
        INNER JOIN "ProductCategory" category
          ON category."id" = rule."categoryId"
        WHERE rule."categoryId" = $3
          AND rule."ownerType" = $1
          AND (
            ($2::text IS NULL AND rule."ownerId" IS NULL)
            OR rule."ownerId" = $2
          )
        LIMIT 1
      `,
      [ownerType, ownerId, categoryId]
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
      | UpdatePlatformCategoryShippingRuleInput
      | UpdateVendorCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query<{ id: string }>(
        `
          UPDATE "CategoryShippingRule"
          SET
            "categoryId" = COALESCE($4, "categoryId"),
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
          input.categoryId,
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
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    const result = await this.pool.query<{ id: string }>(
      `
        UPDATE "CategoryShippingRule"
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
        DELETE FROM "CategoryShippingRuleSubtotalBand"
        WHERE "categoryShippingRuleId" = $1
      `,
      [ruleId]
    );

    for (const subtotalBand of subtotalBands) {
      await client.query(
        `
          INSERT INTO "CategoryShippingRuleSubtotalBand" (
            "categoryShippingRuleId",
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

    const result = await executor.query<CategoryShippingRuleSubtotalBandRow>(
      `
        SELECT
          band."id",
          band."categoryShippingRuleId",
          band."minSubtotal",
          band."maxSubtotal",
          band."methodType",
          band."value",
          band."createdAt",
          band."updatedAt"
        FROM "CategoryShippingRuleSubtotalBand" band
        WHERE band."categoryShippingRuleId" = ANY($1::text[])
        ORDER BY band."minSubtotal" ASC, band."createdAt" ASC
      `,
      [ruleIds]
    );

    for (const row of result.rows) {
      const subtotalBands =
        subtotalBandsByRuleId.get(row.categoryShippingRuleId) ?? [];

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

      subtotalBandsByRuleId.set(row.categoryShippingRuleId, subtotalBands);
    }

    return subtotalBandsByRuleId;
  }

  private mapRow(
    row: CategoryShippingRuleRow,
    subtotalBands: ShippingSubtotalBandRecord[]
  ): CategoryShippingRuleDetailRecord {
    return {
      id: row.id,
      categoryId: row.categoryId,
      ownerType: row.ownerType,
      ownerId: row.ownerId,
      methodType: row.methodType,
      value: Number(row.value),
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      categoryName: row.categoryName,
      subtotalBands
    };
  }
}
