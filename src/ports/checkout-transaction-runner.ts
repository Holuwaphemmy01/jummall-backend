import type { CartRepository } from "./cart-repository";
import type { CheckoutSessionRepository } from "./checkout-session-repository";
import type { InventoryRepository } from "./inventory/inventory-repository";
import type { OrderRepository } from "./order-repository";
import type { ProductRepository } from "./product-repository";

export interface CheckoutTransactionContext {
  cartRepository: CartRepository;
  checkoutSessionRepository: CheckoutSessionRepository;
  inventoryRepository: InventoryRepository;
  orderRepository: OrderRepository;
  productRepository: ProductRepository;
}

export interface CheckoutTransactionRunner {
  run<T>(
    operation: (context: CheckoutTransactionContext) => Promise<T>
  ): Promise<T>;
}

