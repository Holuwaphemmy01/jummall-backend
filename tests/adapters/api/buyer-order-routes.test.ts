import { afterEach, describe, expect, it, jest } from "@jest/globals";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { GetBuyerOrderDetailError } from "../../../src/application/buyer/get-buyer-order-detail";
import { ListBuyerOrdersError } from "../../../src/application/buyer/list-buyer-orders";
import { createProtectedBuyerOrderRouter } from "../../../src/infrastructure/api/routes/buyer-routes";

function createUnusedUseCase() {
  return {
    execute: jest.fn(async () => {
      throw new Error("Unexpected use case call.");
    })
  };
}

async function createServer(
  dependencies: Parameters<typeof createProtectedBuyerOrderRouter>[0]
) {
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.authUser = {
      sub: "buyer-id",
      role: "buyer"
    };
    next();
  });
  app.use("/buyers/orders", createProtectedBuyerOrderRouter(dependencies));

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

describe("buyer order routes", () => {
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

  it("returns a paginated buyer order history payload in snake_case", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const listBuyerOrders = {
      execute: jest.fn(async () => ({
        items: [
          {
            id: "order-1",
            status: "pending_fulfillment" as const,
            currency: "NGN",
            totalItems: 1,
            rawSubtotal: 10000,
            discountedSubtotal: 10000,
            finalShippingFee: 500,
            totalPaid: 10500,
            freeShippingApplied: false,
            paidAt: new Date("2026-04-06T10:00:00.000Z"),
            createdAt: new Date("2026-04-06T10:00:00.000Z"),
            itemsPreview: [
              {
                orderItemId: "order-item-1",
                productId: "product-1",
                productName: "Phone",
                quantity: 1,
                images: [
                  {
                    id: "order-image-1",
                    orderItemId: "order-item-1",
                    storagePath: "products/seller-1/product-1/front.jpg",
                    mimeType: "image/jpeg",
                    originalFileName: "front.jpg",
                    position: 0,
                    createdAt: new Date("2026-04-06T10:00:00.000Z"),
                    updatedAt: new Date("2026-04-06T10:00:00.000Z")
                  }
                ]
              }
            ]
          }
        ],
        total: 1,
        page: 1,
        limit: 20
      }))
    };
    const { server, baseUrl } = await createServer({
      listBuyerOrders: listBuyerOrders as never,
      getBuyerOrderDetail: createUnusedUseCase() as never
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/orders?page=1&limit=20`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      message: "Buyer orders fetched successfully.",
      data: {
        orders: [
          {
            id: "order-1",
            status: "pending_fulfillment",
            currency: "NGN",
            total_items: 1,
            raw_subtotal: 10000,
            discounted_subtotal: 10000,
            final_shipping_fee: 500,
            total_paid: 10500,
            free_shipping_applied: false,
            paid_at: "2026-04-06T10:00:00.000Z",
            created_at: "2026-04-06T10:00:00.000Z",
            items_preview: [
              {
                order_item_id: "order-item-1",
                product_id: "product-1",
                product_name: "Phone",
                quantity: 1,
                primary_image: "products/seller-1/product-1/front.jpg",
                primary_image_public_url: expect.stringContaining(
                  "/storage/v1/object/public/product-images/products/seller-1/product-1/front.jpg"
                )
              }
            ]
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          total_pages: 1
        }
      }
    });
  });

  it("returns validation errors for invalid history pagination", async () => {
    const { server, baseUrl } = await createServer({
      listBuyerOrders: createUnusedUseCase() as never,
      getBuyerOrderDetail: createUnusedUseCase() as never
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/orders?page=0&limit=200`);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      message: "Validation failed.",
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: "page"
        }),
        expect.objectContaining({
          field: "limit"
        })
      ])
    });
  });

  it("returns a buyer order detail payload", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const getBuyerOrderDetail = {
      execute: jest.fn(async () => ({
        id: "order-1",
        checkoutSessionId: "session-1",
        buyerId: "buyer-id",
        paymentProvider: "paystack",
        paymentReference: "chk_1",
        status: "pending_fulfillment" as const,
        currency: "NGN",
        totalItems: 1,
        rawSubtotal: 10000,
        discountedSubtotal: 10000,
        baseShippingFee: 500,
        finalShippingFee: 500,
        totalPaid: 10500,
        shippingMode: "PLATFORM" as const,
        categoryShippingMode: "HIGHEST" as const,
        freeShippingApplied: false,
        freeShippingRuleId: null,
        freeShippingRuleType: null,
        freeShippingCouponCode: null,
        paidAt: new Date("2026-04-06T10:00:00.000Z"),
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
        createdAt: new Date("2026-04-06T10:00:00.000Z"),
        updatedAt: new Date("2026-04-06T10:00:00.000Z"),
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
            images: [
              {
                id: "order-image-1",
                orderItemId: "order-item-1",
                storagePath: "products/seller-1/product-1/front.jpg",
                mimeType: "image/jpeg",
                originalFileName: "front.jpg",
                position: 0,
                createdAt: new Date("2026-04-06T10:00:00.000Z"),
                updatedAt: new Date("2026-04-06T10:00:00.000Z")
              }
            ],
            createdAt: new Date("2026-04-06T10:00:00.000Z"),
            updatedAt: new Date("2026-04-06T10:00:00.000Z")
          }
        ],
        shippingSegments: [
          {
            id: "segment-1",
            orderId: "order-1",
            sellerId: null,
            ruleOwnerType: "platform" as const,
            finalShippingOwnerType: "platform" as const,
            usedFallback: false,
            matchedZoneId: "zone-1",
            matchedZoneName: "Lagos",
            matchedZoneMatchType: "state" as const,
            zoneFee: 500,
            categoryFee: 0,
            baseShippingFee: 500,
            finalShippingFee: 500,
            createdAt: new Date("2026-04-06T10:00:00.000Z"),
            updatedAt: new Date("2026-04-06T10:00:00.000Z")
          }
        ]
      }))
    };
    const { server, baseUrl } = await createServer({
      listBuyerOrders: createUnusedUseCase() as never,
      getBuyerOrderDetail: getBuyerOrderDetail as never
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/orders/order-1`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({
        id: "order-1",
        payment_provider: "paystack",
        items: [
          expect.objectContaining({
            id: "order-item-1",
            product_id: "product-1",
            images: [
              expect.objectContaining({
                storage_path: "products/seller-1/product-1/front.jpg"
              })
            ]
          })
        ]
      })
    );
  });

  it("maps buyer order detail errors to the HTTP response", async () => {
    const getBuyerOrderDetail = {
      execute: jest.fn(async () => {
        throw new GetBuyerOrderDetailError("Order not found.", 404, "orderId");
      })
    };
    const { server, baseUrl } = await createServer({
      listBuyerOrders: createUnusedUseCase() as never,
      getBuyerOrderDetail: getBuyerOrderDetail as never
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/orders/order-1`);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      message: "Order not found.",
      field: "orderId"
    });
  });

  it("maps buyer order history application errors to the HTTP response", async () => {
    const listBuyerOrders = {
      execute: jest.fn(async () => {
        throw new ListBuyerOrdersError("Limit must be between 1 and 100.", 400, "limit");
      })
    };
    const { server, baseUrl } = await createServer({
      listBuyerOrders: listBuyerOrders as never,
      getBuyerOrderDetail: createUnusedUseCase() as never
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/orders`);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      message: "Limit must be between 1 and 100.",
      field: "limit"
    });
  });
});
