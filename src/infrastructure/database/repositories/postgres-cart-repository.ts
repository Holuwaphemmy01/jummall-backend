import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CartItemRecord,
  CartRecord,
  CartRepository,
  CreateCartInput,
  CreateCartItemInput,
  UpdateCartItemQuantityInput
} from "../../../ports/cart-repository";

interface CartRow {
  id: string;
  buyerId: string;
  status: "active" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

interface CartItemRow {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

type Queryable = Pick<Pool, "query">;

export class PostgresCartRepository implements CartRepository {
  constructor(private readonly pool: Queryable = databasePool) {}

  async findActiveByBuyerId(buyerId: string): Promise<CartRecord | null> {
    const result = await this.pool.query<CartRow>(
      `
        SELECT
          "id",
          "buyerId",
          "status",
          "createdAt",
          "updatedAt"
        FROM "Cart"
        WHERE "buyerId" = $1 AND "status" = 'active'
        LIMIT 1
      `,
      [buyerId]
    );

    return result.rows[0] ?? null;
  }

  async createCart(input: CreateCartInput): Promise<CartRecord> {
    const result = await this.pool.query<CartRow>(
      `
        INSERT INTO "Cart" (
          "buyerId",
          "status"
        )
        VALUES ($1, 'active')
        RETURNING
          "id",
          "buyerId",
          "status",
          "createdAt",
          "updatedAt"
      `,
      [input.buyerId]
    );

    return result.rows[0];
  }

  async findItemsByCartId(cartId: string): Promise<CartItemRecord[]> {
    const result = await this.pool.query<CartItemRow>(
      `
        SELECT
          "id",
          "cartId",
          "productId",
          "quantity",
          "createdAt",
          "updatedAt"
        FROM "CartItem"
        WHERE "cartId" = $1
        ORDER BY "createdAt" ASC
      `,
      [cartId]
    );

    return result.rows;
  }

  async clearItemsByCartId(cartId: string): Promise<number> {
    const result = await this.pool.query(
      `
        DELETE FROM "CartItem"
        WHERE "cartId" = $1
      `,
      [cartId]
    );

    return result.rowCount ?? 0;
  }

  async findItemByCartIdAndProductId(
    cartId: string,
    productId: string
  ): Promise<CartItemRecord | null> {
    const result = await this.pool.query<CartItemRow>(
      `
        SELECT
          "id",
          "cartId",
          "productId",
          "quantity",
          "createdAt",
          "updatedAt"
        FROM "CartItem"
        WHERE "cartId" = $1 AND "productId" = $2
        LIMIT 1
      `,
      [cartId, productId]
    );

    return result.rows[0] ?? null;
  }

  async createCartItem(input: CreateCartItemInput): Promise<CartItemRecord> {
    const result = await this.pool.query<CartItemRow>(
      `
        INSERT INTO "CartItem" (
          "cartId",
          "productId",
          "quantity"
        )
        VALUES ($1, $2, $3)
        RETURNING
          "id",
          "cartId",
          "productId",
          "quantity",
          "createdAt",
          "updatedAt"
      `,
      [input.cartId, input.productId, input.quantity]
    );

    return result.rows[0];
  }

  async deleteCartItem(cartItemId: string): Promise<CartItemRecord | null> {
    const result = await this.pool.query<CartItemRow>(
      `
        DELETE FROM "CartItem"
        WHERE "id" = $1
        RETURNING
          "id",
          "cartId",
          "productId",
          "quantity",
          "createdAt",
          "updatedAt"
      `,
      [cartItemId]
    );

    return result.rows[0] ?? null;
  }

  async updateCartItemQuantity(
    input: UpdateCartItemQuantityInput
  ): Promise<CartItemRecord | null> {
    const result = await this.pool.query<CartItemRow>(
      `
        UPDATE "CartItem"
        SET
          "quantity" = $2,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING
          "id",
          "cartId",
          "productId",
          "quantity",
          "createdAt",
          "updatedAt"
      `,
      [input.cartItemId, input.quantity]
    );

    return result.rows[0] ?? null;
  }
}
