import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CreateProductCategoryInput,
  ProductCategoryRecord,
  ProductCategoryRepository,
  UpdateProductCategoryInput
} from "../../../ports/product-category-repository";

interface ProductCategoryRow {
  id: string;
  name: string;
  description: string;
  deductionPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PostgresProductCategoryRepository
  implements ProductCategoryRepository
{
  constructor(private readonly pool: Pool = databasePool) {}

  async create(
    input: CreateProductCategoryInput
  ): Promise<ProductCategoryRecord> {
    const result = await this.pool.query<ProductCategoryRow>(
      `
        INSERT INTO "ProductCategory" (
          "name",
          "description",
          "deductionPercentage"
        )
        VALUES ($1, $2, $3)
        RETURNING
          "id",
          "name",
          "description",
          "deductionPercentage",
          "createdAt",
          "updatedAt"
      `,
      [input.name, input.description, input.deductionPercentage]
    );

    return result.rows[0];
  }

  async findAll(): Promise<ProductCategoryRecord[]> {
    const result = await this.pool.query<ProductCategoryRow>(
      `
        SELECT
          "id",
          "name",
          "description",
          "deductionPercentage",
          "createdAt",
          "updatedAt"
        FROM "ProductCategory"
        ORDER BY "name" ASC
      `
    );

    return result.rows;
  }

  async findById(categoryId: string): Promise<ProductCategoryRecord | null> {
    const result = await this.pool.query<ProductCategoryRow>(
      `
        SELECT
          "id",
          "name",
          "description",
          "deductionPercentage",
          "createdAt",
          "updatedAt"
        FROM "ProductCategory"
        WHERE "id" = $1
        LIMIT 1
      `,
      [categoryId]
    );

    return result.rows[0] ?? null;
  }

  async findByName(name: string): Promise<ProductCategoryRecord | null> {
    const result = await this.pool.query<ProductCategoryRow>(
      `
        SELECT
          "id",
          "name",
          "description",
          "deductionPercentage",
          "createdAt",
          "updatedAt"
        FROM "ProductCategory"
        WHERE LOWER("name") = LOWER($1)
        LIMIT 1
      `,
      [name]
    );

    return result.rows[0] ?? null;
  }

  async update(
    input: UpdateProductCategoryInput
  ): Promise<ProductCategoryRecord | null> {
    const result = await this.pool.query<ProductCategoryRow>(
      `
        UPDATE "ProductCategory"
        SET
          "name" = COALESCE($2, "name"),
          "description" = COALESCE($3, "description"),
          "deductionPercentage" = COALESCE($4, "deductionPercentage"),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING
          "id",
          "name",
          "description",
          "deductionPercentage",
          "createdAt",
          "updatedAt"
      `,
      [
        input.categoryId,
        input.name,
        input.description,
        input.deductionPercentage
      ]
    );

    return result.rows[0] ?? null;
  }
}
