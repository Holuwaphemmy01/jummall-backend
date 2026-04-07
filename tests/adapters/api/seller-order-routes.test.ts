import { afterEach, describe, expect, it, jest } from "@jest/globals";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { GetSellerOrderDetailError } from "../../../src/application/seller/get-order-detail";
import { ListSellerOrdersError } from "../../../src/application/seller/list-orders";
import { UpdateSellerOrderItemDeliveryStatusError } from "../../../src/application/seller/update-order-item-delivery-status";
import { createProtectedSellerOrderRouter } from "../../../src/infrastructure/api/routes/seller-routes";

function createUnusedUseCase() {
  return {
    execute: jest.fn(async () => {
      throw new Error("Unexpected use case call.");
    })
  };
}

async function createServer(
  dependencies: Parameters<typeof createProtectedSellerOrderRouter>[0]
) {
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.authUser = {
      sub: "seller-1",
      role: "seller"
    };
    next();
  });
  app.use("/sellers/orders", createProtectedSellerOrderRouter(dependencies));

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

describe("seller order routes", () => {
  const openServers: Server[] = [];
  const originalSupabaseUrl = process.env.SUPABASE_URL;

  afterEach(async () => {
    while (openServers.length > 0) {
      const server = openServers.pop();

      if (server) {
        await closeServer(server);
      }
    }

    if (originalSupabaseUrl === undefined) {
      delete process.env.SUPABASE_URL;
    } else {
      process.env.SUPABASE_URL = originalSupabaseUrl;
    }
  });

  it("returns paginated seller orders", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const { server, baseUrl } = await createServer({
      listSellerOrders: {
        execute: jest.fn(async () => ({
          items: [
            {
              id: "order-1",
              status: "pending_fulfillment" as const,
              shippingMode: "VENDOR" as const,
              currency: "NGN",
              totalItems: 1,
              subtotal: 10000,
              canUpdateDeliveryStatus: true,
              paidAt: new Date("2026-04-06T10:00:00.000Z"),
              createdAt: new Date("2026-04-06T10:00:00.000Z"),
              itemsPreview: [
                {
                  orderItemId: "order-item-1",
                  productId: "product-1",
                  productName: "Phone",
                  quantity: 1,
                  deliveryStatus: "pending_fulfillment" as const,
                  images: []
                }
              ]
            }
          ],
          total: 1,
          page: 1,
          limit: 20
        }))
      } as never,
      getSellerOrderDetail: createUnusedUseCase() as never,
      updateSellerOrderItemDeliveryStatus: createUnusedUseCase() as never
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/sellers/orders?page=1&limit=20`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.orders[0]).toEqual(
      expect.objectContaining({
        id: "order-1",
        status: "pending_fulfillment",
        shipping_mode: "VENDOR",
        can_update_delivery_status: true,
        items_preview: [
          expect.objectContaining({
            delivery_status: "pending_fulfillment"
          })
        ]
      })
    );
  });

  it("returns one seller order detail with delivery fields", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const { server, baseUrl } = await createServer({
      listSellerOrders: createUnusedUseCase() as never,
      getSellerOrderDetail: {
        execute: jest.fn(async () => ({
          id: "order-1",
          status: "pending_fulfillment" as const,
          shippingMode: "PLATFORM" as const,
          currency: "NGN",
          totalItems: 1,
          subtotal: 10000,
          canUpdateDeliveryStatus: false,
          paidAt: new Date("2026-04-06T10:00:00.000Z"),
          createdAt: new Date("2026-04-06T10:00:00.000Z"),
          updatedAt: new Date("2026-04-06T10:00:00.000Z"),
          billingAddress: {
            fullName: "Buyer One",
            phoneNumber: "08000000000",
            addressLine1: "1 Buyer St",
            addressLine2: null,
            city: "Ikeja",
            state: "Lagos",
            country: "Nigeria",
            postalCode: null
          },
          items: [
            {
              id: "order-item-1",
              orderId: "order-1",
              productId: "product-1",
              sellerId: "seller-1",
              categoryId: "category-1",
              categoryName: "Electronics",
              brandId: null,
              brandName: null,
              productName: "Phone",
              productDescription: "Phone",
              sku: "PHONE-1",
              unitPrice: 10000,
              quantity: 1,
              lineSubtotal: 10000,
              currency: "NGN",
              condition: "new",
              weightKg: 1,
              deliveryStatus: "pending_fulfillment" as const,
              deliveryStatusUpdatedAt: null,
              deliveryStatusUpdatedByUserId: null,
              deliveryStatusUpdatedByRole: null,
              shippedAt: null,
              deliveredAt: null,
              deliveryFailedAt: null,
              deliveryFailureReason: null,
              images: [],
              createdAt: new Date("2026-04-06T10:00:00.000Z"),
              updatedAt: new Date("2026-04-06T10:00:00.000Z")
            }
          ]
        }))
      } as never,
      updateSellerOrderItemDeliveryStatus: createUnusedUseCase() as never
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/sellers/orders/order-1`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({
        can_update_delivery_status: false,
        items: [
          expect.objectContaining({
            delivery_status: "pending_fulfillment",
            can_update_delivery_status: false
          })
        ]
      })
    );
  });

  it("returns updated seller order detail after a delivery status update", async () => {
    const { server, baseUrl } = await createServer({
      listSellerOrders: createUnusedUseCase() as never,
      getSellerOrderDetail: createUnusedUseCase() as never,
      updateSellerOrderItemDeliveryStatus: {
        execute: jest.fn(async () => ({
          id: "order-1",
          status: "shipped" as const,
          shippingMode: "VENDOR" as const,
          currency: "NGN",
          totalItems: 1,
          subtotal: 10000,
          canUpdateDeliveryStatus: true,
          paidAt: new Date("2026-04-06T10:00:00.000Z"),
          createdAt: new Date("2026-04-06T10:00:00.000Z"),
          updatedAt: new Date("2026-04-06T10:00:00.000Z"),
          billingAddress: {
            fullName: "Buyer One",
            phoneNumber: "08000000000",
            addressLine1: "1 Buyer St",
            addressLine2: null,
            city: "Ikeja",
            state: "Lagos",
            country: "Nigeria",
            postalCode: null
          },
          items: [
            {
              id: "order-item-1",
              orderId: "order-1",
              productId: "product-1",
              sellerId: "seller-1",
              categoryId: "category-1",
              categoryName: "Electronics",
              brandId: null,
              brandName: null,
              productName: "Phone",
              productDescription: "Phone",
              sku: "PHONE-1",
              unitPrice: 10000,
              quantity: 1,
              lineSubtotal: 10000,
              currency: "NGN",
              condition: "new",
              weightKg: 1,
              deliveryStatus: "shipped" as const,
              deliveryStatusUpdatedAt: new Date("2026-04-06T12:00:00.000Z"),
              deliveryStatusUpdatedByUserId: "seller-1",
              deliveryStatusUpdatedByRole: "seller" as const,
              shippedAt: new Date("2026-04-06T12:00:00.000Z"),
              deliveredAt: null,
              deliveryFailedAt: null,
              deliveryFailureReason: null,
              images: [],
              createdAt: new Date("2026-04-06T10:00:00.000Z"),
              updatedAt: new Date("2026-04-06T12:00:00.000Z")
            }
          ]
        }))
      } as never
    });
    openServers.push(server);

    const response = await fetch(
      `${baseUrl}/sellers/orders/items/order-item-1/delivery-status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          delivery_status: "shipped"
        })
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items[0]).toEqual(
      expect.objectContaining({
        delivery_status: "shipped",
        delivery_status_updated_at: "2026-04-06T12:00:00.000Z"
      })
    );
  });

  it("maps seller order errors to the HTTP response", async () => {
    const { server, baseUrl } = await createServer({
      listSellerOrders: createUnusedUseCase() as never,
      getSellerOrderDetail: {
        execute: jest.fn(async () => {
          throw new GetSellerOrderDetailError("Order not found.", 404, "orderId");
        })
      } as never,
      updateSellerOrderItemDeliveryStatus: {
        execute: jest.fn(async () => {
          throw new UpdateSellerOrderItemDeliveryStatusError(
            "Only admin can update delivery status for platform-handled logistics orders.",
            403,
            "delivery_status"
          );
        })
      } as never
    });
    openServers.push(server);

    const detailResponse = await fetch(`${baseUrl}/sellers/orders/order-1`);
    expect(detailResponse.status).toBe(404);

    const patchResponse = await fetch(
      `${baseUrl}/sellers/orders/items/order-item-1/delivery-status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          delivery_status: "shipped"
        })
      }
    );
    const patchBody = await patchResponse.json();

    expect(patchResponse.status).toBe(403);
    expect(patchBody).toEqual({
      message:
        "Only admin can update delivery status for platform-handled logistics orders.",
      field: "delivery_status"
    });
  });
});
