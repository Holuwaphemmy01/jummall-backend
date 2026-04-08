import type { Pool } from "pg";

import databasePool from "../client";
import type {
  ApprovedProductCatalogPage,
  ListApprovedProductsInput,
  ProductCatalogRepository
} from "../../../ports/product-catalog-repository";
import type {
  ProductImageRecord,
  ProductRecord
} from "../../../ports/product-repository";

interface ProductRow {
  id: string;
  sellerId: string;
  categoryId: string;
  categoryName: string | null;
  brandId: string | null;
  brandName: string | null;
  name: string;
  description: string;
  sku: string | null;
  price: string;
  quantity: number;
  currency: string;
  condition: string;
  weightKg: string;
  status: "pending_review" | "approved" | "rejected";
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductImageRow {
  id: string;
  productId: string;
  storagePath: string;
  mimeType: string;
  originalFileName: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CountRow {
  total: string;
}

export class PostgresProductCatalogRepository
  implements ProductCatalogRepository
{
  constructor(private readonly pool: Pool = databasePool) {}

  async findApprovedById(productId: string): Promise<ProductRecord | null> {
    const productResult = await this.pool.query<ProductRow>(
      `
        SELECT
          p."id",
          p."sellerId",
          p."categoryId",
          pc."name" AS "categoryName",
          p."brandId",
          pb."name" AS "brandName",
          p."name",
          p."description",
          p."sku",
          p."price",
          p."quantity",
          p."currency",
          p."condition",
          p."weightKg",
          p."status",
          p."reviewNote",
          p."reviewedAt",
          p."createdAt",
          p."updatedAt"
        FROM "Product" p
        LEFT JOIN "ProductCategory" pc ON pc."id" = p."categoryId"
        LEFT JOIN "ProductBrand" pb ON pb."id" = p."brandId"
        WHERE p."id" = $1
          AND p."status" = 'approved'
        LIMIT 1
      `,
      [productId]
    );

    const product = productResult.rows[0];

    if (!product) {
      return null;
    }

    return this.mapProduct(product, await this.findImagesByProductId(product.id));
  }

  async listApproved(
    input: ListApprovedProductsInput
  ): Promise<ApprovedProductCatalogPage> {
    const filters: string[] = [`p."status" = 'approved'`, `p."quantity" > 0`];
    const values: Array<string | number> = [];

    if (input.categoryId) {
      values.push(input.categoryId);
      filters.push(`p."categoryId" = $${values.length}`);
    }

    if (input.brandId) {
      values.push(input.brandId);
      filters.push(`p."brandId" = $${values.length}`);
    }

    if (typeof input.minPrice === "number") {
      values.push(input.minPrice);
      filters.push(`p."price" >= $${values.length}`);
    }

    if (typeof input.maxPrice === "number") {
      values.push(input.maxPrice);
      filters.push(`p."price" <= $${values.length}`);
    }

    if (input.search) {
      values.push(`%${input.search}%`);
      filters.push(`p."name" ILIKE $${values.length}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const countResult = await this.pool.query<CountRow>(
      `
        SELECT COUNT(*)::TEXT AS "total"
        FROM "Product" p
        ${whereClause}
      `,
      values
    );

    const offset = (input.page - 1) * input.limit;
    const queryValues = [...values, input.limit, offset];
    const limitPlaceholder = `$${queryValues.length - 1}`;
    const offsetPlaceholder = `$${queryValues.length}`;

    const productResult = await this.pool.query<ProductRow>(
      `
        SELECT
          p."id",
          p."sellerId",
          p."categoryId",
          pc."name" AS "categoryName",
          p."brandId",
          pb."name" AS "brandName",
          p."name",
          p."description",
          p."sku",
          p."price",
          p."quantity",
          p."currency",
          p."condition",
          p."weightKg",
          p."status",
          p."reviewNote",
          p."reviewedAt",
          p."createdAt",
          p."updatedAt"
        FROM "Product" p
        LEFT JOIN "ProductCategory" pc ON pc."id" = p."categoryId"
        LEFT JOIN "ProductBrand" pb ON pb."id" = p."brandId"
        ${whereClause}
        ORDER BY COALESCE(p."reviewedAt", p."updatedAt", p."createdAt") DESC, p."createdAt" DESC
        LIMIT ${limitPlaceholder}
        OFFSET ${offsetPlaceholder}
      `,
      queryValues
    );

    const items = await Promise.all(
      productResult.rows.map(async (product) =>
        this.mapProduct(product, await this.findImagesByProductId(product.id))
      )
    );

    return {
      items,
      total: Number(countResult.rows[0]?.total ?? 0),
      page: input.page,
      limit: input.limit
    };
  }

  async searchApprovedSuggestions(input: {
    query: string;
    limit: number;
  }): Promise<ProductRecord[]> {
    const values: Array<string | number> = [
      `%${input.query}%`,
      input.query.toLowerCase(),
      input.limit
    ];

    const productResult = await this.pool.query<ProductRow>(
      `
        SELECT
          p."id",
          p."sellerId",
          p."categoryId",
          pc."name" AS "categoryName",
          p."brandId",
          pb."name" AS "brandName",
          p."name",
          p."description",
          p."sku",
          p."price",
          p."quantity",
          p."currency",
          p."condition",
          p."weightKg",
          p."status",
          p."reviewNote",
          p."reviewedAt",
          p."createdAt",
          p."updatedAt"
        FROM "Product" p
        LEFT JOIN "ProductCategory" pc ON pc."id" = p."categoryId"
        LEFT JOIN "ProductBrand" pb ON pb."id" = p."brandId"
        WHERE
          p."status" = 'approved'
          AND p."quantity" > 0
          AND (
            p."name" ILIKE $1
            OR COALESCE(pb."name", '') ILIKE $1
          )
        ORDER BY
          CASE
            WHEN LOWER(p."name") = $2 THEN 0
            WHEN LOWER(p."name") LIKE $2 || '%' THEN 1
            WHEN LOWER(COALESCE(pb."name", '')) LIKE $2 || '%' THEN 2
            ELSE 3
          END,
          COALESCE(p."reviewedAt", p."updatedAt", p."createdAt") DESC,
          p."createdAt" DESC
        LIMIT $3
      `,
      values
    );

    return Promise.all(
      productResult.rows.map(async (product) =>
        this.mapProduct(product, await this.findImagesByProductId(product.id))
      )
    );
  }

  private async findImagesByProductId(productId: string): Promise<ProductImageRow[]> {
    const result = await this.pool.query<ProductImageRow>(
      `
        SELECT
          "id",
          "productId",
          "storagePath",
          "mimeType",
          "originalFileName",
          "position",
          "createdAt",
          "updatedAt"
        FROM "ProductImage"
        WHERE "productId" = $1
        ORDER BY "position" ASC, "createdAt" ASC
      `,
      [productId]
    );

    return result.rows;
  }

  private mapProduct(
    product: ProductRow,
    images: ProductImageRow[]
  ): ProductRecord {
    return {
      id: product.id,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      brandId: product.brandId,
      brandName: product.brandName,
      name: product.name,
      description: product.description,
      sku: product.sku,
      price: Number(product.price),
      quantity: product.quantity,
      currency: product.currency,
      condition: product.condition,
      weightKg: Number(product.weightKg),
      status: product.status,
      reviewNote: product.reviewNote,
      reviewedAt: product.reviewedAt,
      images: images.map((image) => this.mapImage(image)),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  }

  private mapImage(image: ProductImageRow): ProductImageRecord {
    return {
      id: image.id,
      productId: image.productId,
      storagePath: image.storagePath,
      mimeType: image.mimeType,
      originalFileName: image.originalFileName,
      position: image.position,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt
    };
  }
}
