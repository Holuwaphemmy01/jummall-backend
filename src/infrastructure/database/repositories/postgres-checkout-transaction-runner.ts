import type { Pool, PoolClient } from "pg";

import databasePool from "../client";
import type {
  CheckoutTransactionContext,
  CheckoutTransactionRunner
} from "../../../ports/checkout-transaction-runner";
import { PostgresCartRepository } from "./postgres-cart-repository";
import { PostgresCheckoutSessionRepository } from "./postgres-checkout-session-repository";
import { PostgresInventoryRepository } from "./postgres-inventory-repository";
import { PostgresOrderRepository } from "./postgres-order-repository";
import { PostgresProductRepository } from "./postgres-product-repository";

export class PostgresCheckoutTransactionRunner
  implements CheckoutTransactionRunner
{
  constructor(private readonly pool: Pool = databasePool) {}

  async run<T>(
    operation: (context: CheckoutTransactionContext) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const context = this.createContext(client);
      const result = await operation(context);

      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private createContext(client: PoolClient): CheckoutTransactionContext {
    return {
      cartRepository: new PostgresCartRepository(client),
      checkoutSessionRepository: new PostgresCheckoutSessionRepository(client),
      inventoryRepository: new PostgresInventoryRepository(client),
      orderRepository: new PostgresOrderRepository(client),
      productRepository: new PostgresProductRepository(client)
    };
  }
}
