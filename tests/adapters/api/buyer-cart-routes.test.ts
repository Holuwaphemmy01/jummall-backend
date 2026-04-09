import { afterEach, describe, expect, it, jest } from "@jest/globals";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { createProtectedBuyerCartRouter } from "../../../src/infrastructure/api/routes/buyer-routes";

function createUnusedUseCase() {
  return {
    execute: jest.fn(async () => {
      throw new Error("Unexpected use case call.");
    })
  };
}

async function createServer(getActiveCart: {
  execute: jest.Mock;
}): Promise<{ server: Server; baseUrl: string }> {
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.authUser = {
      sub: "buyer-id",
      role: "buyer"
    };
    next();
  });
  app.use(
    "/buyers/cart",
    createProtectedBuyerCartRouter({
      clearBuyerCart: createUnusedUseCase() as never,
      getActiveCart: getActiveCart as never,
      addProductToCart: createUnusedUseCase() as never,
      calculateCartShipping: createUnusedUseCase() as never,
      removeProductFromCart: createUnusedUseCase() as never,
      updateProductQuantityInCart: createUnusedUseCase() as never
    })
  );

  const server = await new Promise<Server>((resolve) => {
    const createdServer = app.listen(0, () => resolve(createdServer));
  });
  const address = server.address() as AddressInfo;

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

async function closeServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

describe("buyer cart routes", () => {
  const openServers: Server[] = [];

  afterEach(async () => {
    while (openServers.length > 0) {
      const server = openServers.pop();

      if (server) {
        await closeServer(server);
      }
    }
  });

  it("returns total_products alongside quantity-based total_items", async () => {
    const getActiveCart = {
      execute: jest.fn(async () => ({
        cart: {
          id: "cart-id",
          buyerId: "buyer-id",
          status: "active",
          createdAt: new Date("2026-03-30T00:00:00.000Z"),
          updatedAt: new Date("2026-03-30T00:00:00.000Z")
        },
        items: [
          {
            id: "cart-item-id",
            productId: "product-id",
            quantity: 2,
            unitPrice: 85000,
            subtotal: 170000,
            currency: "NGN",
            product: {
              id: "product-id",
              name: "Wireless Headset",
              description: "Noise-cancelling wireless headset",
              brandId: "brand-id",
              brandName: "Apple",
              categoryId: "category-id",
              sku: "HEADSET-001",
              condition: "new",
              weightKg: 0.4,
              status: "approved",
              availableQuantity: 10,
              images: []
            },
            createdAt: new Date("2026-03-30T00:00:00.000Z"),
            updatedAt: new Date("2026-03-30T00:00:00.000Z")
          }
        ],
        totalItems: 2,
        totalProducts: 1,
        subtotal: 170000,
        currency: "NGN"
      }))
    };
    const { server, baseUrl } = await createServer(getActiveCart);
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/cart`);
    const body = await response.json();

    expect(response.status).toBe(200);
    const getActiveCartCall = (getActiveCart.execute.mock.calls as unknown[][])[0]?.[0];

    expect(getActiveCartCall).toEqual({
      buyerId: "buyer-id"
    });
    expect(body).toEqual({
      message: "Buyer cart fetched successfully.",
      data: {
        cart_id: "cart-id",
        cart_status: "active",
        items: [
          {
            id: "cart-item-id",
            product_id: "product-id",
            quantity: 2,
            unit_price: 85000,
            subtotal: 170000,
            currency: "NGN",
            product: {
              id: "product-id",
              name: "Wireless Headset",
              description: "Noise-cancelling wireless headset",
              brand_id: "brand-id",
              brand_name: "Apple",
              category_id: "category-id",
              sku: "HEADSET-001",
              condition: "new",
              weight_kg: 0.4,
              status: "approved",
              available_quantity: 10,
              images: []
            },
            created_at: "2026-03-30T00:00:00.000Z",
            updated_at: "2026-03-30T00:00:00.000Z"
          }
        ],
        summary: {
          total_items: 2,
          total_products: 1,
          subtotal: 170000,
          currency: "NGN"
        }
      }
    });
  });
});
