import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CreateWishlistItemInput,
  WishlistItemRecord,
  WishlistRepository
} from "../../../ports/wishlist-repository";

interface WishlistItemRow {
  id: string;
  buyerId: string;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PostgresWishlistRepository implements WishlistRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async create(input: CreateWishlistItemInput): Promise<WishlistItemRecord> {
    const result = await this.pool.query<WishlistItemRow>(
      `
        INSERT INTO "WishlistItem" (
          "buyerId",
          "productId"
        )
        VALUES ($1, $2)
        RETURNING
          "id",
          "buyerId",
          "productId",
          "createdAt",
          "updatedAt"
      `,
      [input.buyerId, input.productId]
    );

    return result.rows[0];
  }

  async findByBuyerId(buyerId: string): Promise<WishlistItemRecord[]> {
    const result = await this.pool.query<WishlistItemRow>(
      `
        SELECT
          "id",
          "buyerId",
          "productId",
          "createdAt",
          "updatedAt"
        FROM "WishlistItem"
        WHERE "buyerId" = $1
        ORDER BY "createdAt" DESC
      `,
      [buyerId]
    );

    return result.rows;
  }

  async findByBuyerIdAndProductId(
    buyerId: string,
    productId: string
  ): Promise<WishlistItemRecord | null> {
    const result = await this.pool.query<WishlistItemRow>(
      `
        SELECT
          "id",
          "buyerId",
          "productId",
          "createdAt",
          "updatedAt"
        FROM "WishlistItem"
        WHERE "buyerId" = $1 AND "productId" = $2
        LIMIT 1
      `,
      [buyerId, productId]
    );

    return result.rows[0] ?? null;
  }

  async deleteByBuyerIdAndProductId(
    buyerId: string,
    productId: string
  ): Promise<WishlistItemRecord | null> {
    const result = await this.pool.query<WishlistItemRow>(
      `
        DELETE FROM "WishlistItem"
        WHERE "buyerId" = $1 AND "productId" = $2
        RETURNING
          "id",
          "buyerId",
          "productId",
          "createdAt",
          "updatedAt"
      `,
      [buyerId, productId]
    );

    return result.rows[0] ?? null;
  }
}
