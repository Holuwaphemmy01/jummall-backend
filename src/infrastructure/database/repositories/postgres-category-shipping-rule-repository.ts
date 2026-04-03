import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CategoryShippingRuleRepository,
  CreatePlatformCategoryShippingRuleInput,
  UpdatePlatformCategoryShippingRuleInput,
  UpdatePlatformCategoryShippingRuleStatusInput
} from "../../../ports/shipping/category-shipping-rule-repository";
import type {
  CategoryShippingRuleDetailRecord,
  ShippingMethodType,
  ShippingRuleStatus
} from "../../../ports/shipping/shipping-models";

interface CategoryShippingRuleRow {
  id: string;
  categoryId: string;
  ownerType: "platform";
  ownerId: null;
  methodType: ShippingMethodType;
  value: string;
  status: ShippingRuleStatus;
  createdAt: Date;
  updatedAt: Date;
  categoryName: string;
}

export class PostgresCategoryShippingRuleRepository
  implements CategoryShippingRuleRepository
{
  constructor(private readonly pool: Pool = databasePool) {}

  async createPlatform(
    input: CreatePlatformCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord> {
    const result = await this.pool.query<CategoryShippingRuleRow>(
      `
        INSERT INTO "CategoryShippingRule" (
          "categoryId",
          "ownerType",
          "ownerId",
          "methodType",
          "value",
          "status"
        )
        VALUES ($1, 'platform', NULL, $2, $3, 'active')
        RETURNING
          "id",
          "categoryId",
          "ownerType",
          "ownerId",
          "methodType",
          "value",
          "status",
          "createdAt",
          "updatedAt"
      `,
      [input.categoryId, input.methodType, input.value]
    );

    return this.findPlatformById(result.rows[0].id).then((rule) => {
      if (!rule) {
        throw new Error(
          "Platform category shipping rule was created but could not be loaded."
        );
      }

      return rule;
    });
  }

  async findAllPlatform(): Promise<CategoryShippingRuleDetailRecord[]> {
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
        WHERE rule."ownerType" = 'platform'
          AND rule."ownerId" IS NULL
        ORDER BY category."name" ASC
      `
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async findPlatformById(
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

  async findPlatformByCategoryId(
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
        WHERE rule."categoryId" = $1
          AND rule."ownerType" = 'platform'
          AND rule."ownerId" IS NULL
        LIMIT 1
      `,
      [categoryId]
    );

    const row = result.rows[0];

    return row ? this.mapRow(row) : null;
  }

  async updatePlatform(
    input: UpdatePlatformCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    const result = await this.pool.query<CategoryShippingRuleRow>(
      `
        UPDATE "CategoryShippingRule"
        SET
          "categoryId" = COALESCE($2, "categoryId"),
          "methodType" = COALESCE($3, "methodType"),
          "value" = COALESCE($4, "value"),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
          AND "ownerType" = 'platform'
          AND "ownerId" IS NULL
        RETURNING
          "id",
          "categoryId",
          "ownerType",
          "ownerId",
          "methodType",
          "value",
          "status",
          "createdAt",
          "updatedAt"
      `,
      [input.ruleId, input.categoryId, input.methodType, input.value]
    );

    const ruleId = result.rows[0]?.id;

    if (!ruleId) {
      return null;
    }

    return this.findPlatformById(ruleId);
  }

  async updatePlatformStatus(
    input: UpdatePlatformCategoryShippingRuleStatusInput
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    const result = await this.pool.query<CategoryShippingRuleRow>(
      `
        UPDATE "CategoryShippingRule"
        SET
          "status" = $2,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
          AND "ownerType" = 'platform'
          AND "ownerId" IS NULL
        RETURNING
          "id",
          "categoryId",
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

  private mapRow(row: CategoryShippingRuleRow): CategoryShippingRuleDetailRecord {
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
      categoryName: row.categoryName
    };
  }
}
