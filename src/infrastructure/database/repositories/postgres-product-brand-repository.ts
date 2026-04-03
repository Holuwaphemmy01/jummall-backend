import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CreateProductBrandInput,
  ProductBrandImageRecord,
  ProductBrandRecord,
  ProductBrandRepository,
  UpdateProductBrandInput
} from "../../../ports/product-brand-repository";

interface ProductBrandRow {
  id: string;
  name: string;
  description: string;
  imageStoragePath: string | null;
  imageMimeType: string | null;
  imageOriginalFileName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PostgresProductBrandRepository implements ProductBrandRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async create(input: CreateProductBrandInput): Promise<ProductBrandRecord> {
    const result = await this.pool.query<ProductBrandRow>(
      `
        INSERT INTO "ProductBrand" (
          "name",
          "description",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName"
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          "id",
          "name",
          "description",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
      `,
      [
        input.name,
        input.description,
        input.image?.storagePath ?? null,
        input.image?.mimeType ?? null,
        input.image?.originalFileName ?? null
      ]
    );

    return this.mapRowToRecord(result.rows[0]);
  }

  async findAll(): Promise<ProductBrandRecord[]> {
    const result = await this.pool.query<ProductBrandRow>(
      `
        SELECT
          "id",
          "name",
          "description",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
        FROM "ProductBrand"
        ORDER BY "name" ASC
      `
    );

    return result.rows.map((row) => this.mapRowToRecord(row));
  }

  async findById(brandId: string): Promise<ProductBrandRecord | null> {
    const result = await this.pool.query<ProductBrandRow>(
      `
        SELECT
          "id",
          "name",
          "description",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
        FROM "ProductBrand"
        WHERE "id" = $1
        LIMIT 1
      `,
      [brandId]
    );

    return result.rows[0] ? this.mapRowToRecord(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<ProductBrandRecord | null> {
    const result = await this.pool.query<ProductBrandRow>(
      `
        SELECT
          "id",
          "name",
          "description",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
        FROM "ProductBrand"
        WHERE LOWER("name") = LOWER($1)
        LIMIT 1
      `,
      [name]
    );

    return result.rows[0] ? this.mapRowToRecord(result.rows[0]) : null;
  }

  async update(input: UpdateProductBrandInput): Promise<ProductBrandRecord | null> {
    const result = await this.pool.query<ProductBrandRow>(
      `
        UPDATE "ProductBrand"
        SET
          "name" = COALESCE($2, "name"),
          "description" = COALESCE($3, "description"),
          "imageStoragePath" = COALESCE($4, "imageStoragePath"),
          "imageMimeType" = COALESCE($5, "imageMimeType"),
          "imageOriginalFileName" = COALESCE($6, "imageOriginalFileName"),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING
          "id",
          "name",
          "description",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
      `,
      [
        input.brandId,
        input.name,
        input.description,
        input.image?.storagePath,
        input.image?.mimeType,
        input.image?.originalFileName
      ]
    );

    return result.rows[0] ? this.mapRowToRecord(result.rows[0]) : null;
  }

  private mapRowToRecord(row: ProductBrandRow): ProductBrandRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      image: this.mapImage(row),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private mapImage(row: ProductBrandRow): ProductBrandImageRecord | null {
    if (
      !row.imageStoragePath ||
      !row.imageMimeType ||
      !row.imageOriginalFileName
    ) {
      return null;
    }

    return {
      storagePath: row.imageStoragePath,
      mimeType: row.imageMimeType,
      originalFileName: row.imageOriginalFileName
    };
  }
}
