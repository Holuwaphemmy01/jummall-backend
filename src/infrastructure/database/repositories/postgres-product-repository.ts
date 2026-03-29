import type { Pool, PoolClient } from "pg";

import databasePool from "../client";
import type {
  CreateProductImageInput,
  CreateProductInput,
  ProductImageRecord,
  ProductRecord,
  ProductRepository,
  UpdateProductStatusInput
} from "../../../ports/product-repository";

interface ProductRow {
  id: string;
  sellerId: string;
  categoryId: string;
  name: string;
  description: string;
  sku: string | null;
  price: string;
  quantity: number;
  currency: string;
  condition: string;
  brand: string | null;
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

export class PostgresProductRepository implements ProductRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async create(input: CreateProductInput): Promise<ProductRecord> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const product = await this.insertProduct(client, input);
      const images = await this.insertProductImages(client, product.id, input.images);

      await client.query("COMMIT");

      return this.mapProduct(product, images);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(productId: string): Promise<ProductRecord | null> {
    const productResult = await this.pool.query<ProductRow>(
      `
        SELECT
          "id",
          "sellerId",
          "categoryId",
          "name",
          "description",
          "sku",
          "price",
          "quantity",
          "currency",
          "condition",
          "brand",
          "weightKg",
          "status",
          "reviewNote",
          "reviewedAt",
          "createdAt",
          "updatedAt"
        FROM "Product"
        WHERE "id" = $1
        LIMIT 1
      `,
      [productId]
    );

    const product = productResult.rows[0];

    if (!product) {
      return null;
    }

    const images = await this.findImagesByProductId(product.id);

    return this.mapProduct(product, images);
  }

  async findBySellerId(sellerId: string): Promise<ProductRecord[]> {
    const productResult = await this.pool.query<ProductRow>(
      `
        SELECT
          "id",
          "sellerId",
          "categoryId",
          "name",
          "description",
          "sku",
          "price",
          "quantity",
          "currency",
          "condition",
          "brand",
          "weightKg",
          "status",
          "reviewNote",
          "reviewedAt",
          "createdAt",
          "updatedAt"
        FROM "Product"
        WHERE "sellerId" = $1
        ORDER BY "createdAt" DESC
      `,
      [sellerId]
    );

    return Promise.all(
      productResult.rows.map(async (product) =>
        this.mapProduct(product, await this.findImagesByProductId(product.id))
      )
    );
  }

  async findPendingReview(): Promise<ProductRecord[]> {
    const productResult = await this.pool.query<ProductRow>(
      `
        SELECT
          "id",
          "sellerId",
          "categoryId",
          "name",
          "description",
          "sku",
          "price",
          "quantity",
          "currency",
          "condition",
          "brand",
          "weightKg",
          "status",
          "reviewNote",
          "reviewedAt",
          "createdAt",
          "updatedAt"
        FROM "Product"
        WHERE "status" = 'pending_review'
        ORDER BY "createdAt" ASC
      `
    );

    return Promise.all(
      productResult.rows.map(async (product) =>
        this.mapProduct(product, await this.findImagesByProductId(product.id))
      )
    );
  }

  async updateStatus(
    input: UpdateProductStatusInput
  ): Promise<ProductRecord | null> {
    const result = await this.pool.query<ProductRow>(
      `
        UPDATE "Product"
        SET
          "status" = $2,
          "reviewNote" = $3,
          "reviewedAt" = $4,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING
          "id",
          "sellerId",
          "categoryId",
          "name",
          "description",
          "sku",
          "price",
          "quantity",
          "currency",
          "condition",
          "brand",
          "weightKg",
          "status",
          "reviewNote",
          "reviewedAt",
          "createdAt",
          "updatedAt"
      `,
      [
        input.productId,
        input.status,
        input.reviewNote ?? null,
        input.reviewedAt ?? null
      ]
    );

    const product = result.rows[0];

    if (!product) {
      return null;
    }

    const images = await this.findImagesByProductId(product.id);

    return this.mapProduct(product, images);
  }

  private async insertProduct(
    client: PoolClient,
    input: CreateProductInput
  ): Promise<ProductRow> {
    const result = await client.query<ProductRow>(
      `
        INSERT INTO "Product" (
          "sellerId",
          "categoryId",
          "name",
          "description",
          "sku",
          "price",
          "quantity",
          "currency",
          "condition",
          "brand",
          "weightKg",
          "status"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending_review')
        RETURNING
          "id",
          "sellerId",
          "categoryId",
          "name",
          "description",
          "sku",
          "price",
          "quantity",
          "currency",
          "condition",
          "brand",
          "weightKg",
          "status",
          "reviewNote",
          "reviewedAt",
          "createdAt",
          "updatedAt"
      `,
      [
        input.sellerId,
        input.categoryId,
        input.name,
        input.description,
        input.sku ?? null,
        input.price,
        input.quantity,
        input.currency,
        input.condition,
        input.brand ?? null,
        input.weightKg
      ]
    );

    return result.rows[0];
  }

  private async insertProductImages(
    client: PoolClient,
    productId: string,
    images: CreateProductImageInput[]
  ): Promise<ProductImageRow[]> {
    const insertedImages: ProductImageRow[] = [];

    for (const image of images) {
      const result = await client.query<ProductImageRow>(
        `
          INSERT INTO "ProductImage" (
            "productId",
            "storagePath",
            "mimeType",
            "originalFileName",
            "position"
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING
            "id",
            "productId",
            "storagePath",
            "mimeType",
            "originalFileName",
            "position",
            "createdAt",
            "updatedAt"
        `,
        [
          productId,
          image.storagePath,
          image.mimeType,
          image.originalFileName,
          image.position
        ]
      );

      insertedImages.push(result.rows[0]);
    }

    return insertedImages;
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
      name: product.name,
      description: product.description,
      sku: product.sku,
      price: Number(product.price),
      quantity: product.quantity,
      currency: product.currency,
      condition: product.condition,
      brand: product.brand,
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
