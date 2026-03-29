import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CreateProductBrandInput,
  ProductBrandRecord,
  ProductBrandRepository,
  UpdateProductBrandInput
} from "../../../ports/product-brand-repository";

interface ProductBrandRow {
  id: string;
  name: string;
  description: string;
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
          "description"
        )
        VALUES ($1, $2)
        RETURNING
          "id",
          "name",
          "description",
          "createdAt",
          "updatedAt"
      `,
      [input.name, input.description]
    );

    return result.rows[0];
  }

  async findAll(): Promise<ProductBrandRecord[]> {
    const result = await this.pool.query<ProductBrandRow>(
      `
        SELECT
          "id",
          "name",
          "description",
          "createdAt",
          "updatedAt"
        FROM "ProductBrand"
        ORDER BY "name" ASC
      `
    );

    return result.rows;
  }

  async findById(brandId: string): Promise<ProductBrandRecord | null> {
    const result = await this.pool.query<ProductBrandRow>(
      `
        SELECT
          "id",
          "name",
          "description",
          "createdAt",
          "updatedAt"
        FROM "ProductBrand"
        WHERE "id" = $1
        LIMIT 1
      `,
      [brandId]
    );

    return result.rows[0] ?? null;
  }

  async findByName(name: string): Promise<ProductBrandRecord | null> {
    const result = await this.pool.query<ProductBrandRow>(
      `
        SELECT
          "id",
          "name",
          "description",
          "createdAt",
          "updatedAt"
        FROM "ProductBrand"
        WHERE LOWER("name") = LOWER($1)
        LIMIT 1
      `,
      [name]
    );

    return result.rows[0] ?? null;
  }

  async update(input: UpdateProductBrandInput): Promise<ProductBrandRecord | null> {
    const result = await this.pool.query<ProductBrandRow>(
      `
        UPDATE "ProductBrand"
        SET
          "name" = COALESCE($2, "name"),
          "description" = COALESCE($3, "description"),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING
          "id",
          "name",
          "description",
          "createdAt",
          "updatedAt"
      `,
      [input.brandId, input.name, input.description]
    );

    return result.rows[0] ?? null;
  }
}
