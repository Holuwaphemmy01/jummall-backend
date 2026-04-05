import type { Pool } from "pg";

import databasePool from "../client";
import type {
  InventoryDecrementInput,
  InventoryRepository
} from "../../../ports/inventory/inventory-repository";

type Queryable = Pick<Pool, "query">;

export class PostgresInventoryRepository implements InventoryRepository {
  constructor(private readonly executor: Queryable = databasePool) {}

  async decrementAvailableQuantities(
    input: InventoryDecrementInput[]
  ): Promise<void> {
    for (const item of input) {
      const result = await this.executor.query(
        `
          UPDATE "Product"
          SET
            "quantity" = "quantity" - $2,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $1
            AND "quantity" >= $2
        `,
        [item.productId, item.quantity]
      );

      if ((result.rowCount ?? 0) !== 1) {
        throw new Error(
          `Unable to decrement product inventory for ${item.productId}.`
        );
      }
    }
  }
}

