import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CreateProductCategoryInput,
  ProductCategoryImageRecord,
  ProductCategoryRecord,
  ProductCategoryRepository,
  UpdateProductCategoryInput
} from "../../../ports/product-category-repository";

interface ProductCategoryRow {
  id: string;
  name: string;
  description: string;
  deductionPercentage: number;
  imageStoragePath: string | null;
  imageMimeType: string | null;
  imageOriginalFileName: string | null;
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
          "deductionPercentage",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName"
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          "id",
          "name",
          "description",
          "deductionPercentage",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
      `,
      [
        input.name,
        input.description,
        input.deductionPercentage,
        input.image?.storagePath ?? null,
        input.image?.mimeType ?? null,
        input.image?.originalFileName ?? null
      ]
    );

    return this.mapRowToRecord(result.rows[0]);
  }

  async findAll(): Promise<ProductCategoryRecord[]> {
    const result = await this.pool.query<ProductCategoryRow>(
      `
        SELECT
          "id",
          "name",
          "description",
          "deductionPercentage",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
        FROM "ProductCategory"
        ORDER BY "name" ASC
      `
    );

    return result.rows.map((row) => this.mapRowToRecord(row));
  }

  async findById(categoryId: string): Promise<ProductCategoryRecord | null> {
    const result = await this.pool.query<ProductCategoryRow>(
      `
        SELECT
          "id",
          "name",
          "description",
          "deductionPercentage",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
        FROM "ProductCategory"
        WHERE "id" = $1
        LIMIT 1
      `,
      [categoryId]
    );

    return result.rows[0] ? this.mapRowToRecord(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<ProductCategoryRecord | null> {
    const result = await this.pool.query<ProductCategoryRow>(
      `
        SELECT
          "id",
          "name",
          "description",
          "deductionPercentage",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
        FROM "ProductCategory"
        WHERE LOWER("name") = LOWER($1)
        LIMIT 1
      `,
      [name]
    );

    return result.rows[0] ? this.mapRowToRecord(result.rows[0]) : null;
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
          "imageStoragePath" = COALESCE($5, "imageStoragePath"),
          "imageMimeType" = COALESCE($6, "imageMimeType"),
          "imageOriginalFileName" = COALESCE($7, "imageOriginalFileName"),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING
          "id",
          "name",
          "description",
          "deductionPercentage",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
      `,
      [
        input.categoryId,
        input.name,
        input.description,
        input.deductionPercentage,
        input.image?.storagePath,
        input.image?.mimeType,
        input.image?.originalFileName
      ]
    );

    return result.rows[0] ? this.mapRowToRecord(result.rows[0]) : null;
  }

  private mapRowToRecord(row: ProductCategoryRow): ProductCategoryRecord {
    let image: ProductCategoryImageRecord | null = null;

    if (
      row.imageStoragePath &&
      row.imageMimeType &&
      row.imageOriginalFileName
    ) {
      image = {
        storagePath: row.imageStoragePath,
        mimeType: row.imageMimeType,
        originalFileName: row.imageOriginalFileName
      };
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      deductionPercentage: row.deductionPercentage,
      image,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}
