import { afterEach, describe, expect, it, jest } from "@jest/globals";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { GetOrderDetailError } from "../../../src/application/admin/get-order-detail";
import { ListOrdersError } from "../../../src/application/admin/list-orders";
import { UpdateOrderItemDeliveryStatusError } from "../../../src/application/admin/update-order-item-delivery-status";
import createAdminRouter from "../../../src/infrastructure/api/routes/admin-routes";

function createUnusedUseCase() {
  return {
    execute: jest.fn(async () => {
      throw new Error("Unexpected use case call.");
    })
  };
}

function createAdminRouterDependencies(overrides: Record<string, unknown>) {
  return {
    approveProductPendingReview: createUnusedUseCase(),
    approveSellerKyc: createUnusedUseCase(),
    createCategoryShippingRule: createUnusedUseCase(),
    createFreeShippingRule: createUnusedUseCase(),
    createSlider: createUnusedUseCase(),
    createProductBrand: createUnusedUseCase(),
    createProductCategory: createUnusedUseCase(),
    createShippingZone: createUnusedUseCase(),
    createShippingZoneRule: createUnusedUseCase(),
    getCategoryShippingRule: createUnusedUseCase(),
    getFreeShippingRule: createUnusedUseCase(),
    getSlider: createUnusedUseCase(),
    getProductBrand: createUnusedUseCase(),
    getProductPendingReviewDetail: createUnusedUseCase(),
    getCompletedSellerKyc: createUnusedUseCase(),
    getOrderDetail: createUnusedUseCase(),
    getProductCategory: createUnusedUseCase(),
    getShippingZone: createUnusedUseCase(),
    getShippingZoneRule: createUnusedUseCase(),
    getShippingSettings: createUnusedUseCase(),
    listCompletedSellerKyc: createUnusedUseCase(),
    listFreeShippingRules: createUnusedUseCase(),
    listSliders: createUnusedUseCase(),
    listOrders: createUnusedUseCase(),
    listCategoryShippingRules: createUnusedUseCase(),
    listProductBrands: createUnusedUseCase(),
    listProductsPendingReview: createUnusedUseCase(),
    listProductCategories: createUnusedUseCase(),
    listShippingZoneRules: createUnusedUseCase(),
    listShippingZones: createUnusedUseCase(),
    rejectProductPendingReview: createUnusedUseCase(),
    setCategoryShippingRuleStatus: createUnusedUseCase(),
    setFreeShippingRuleStatus: createUnusedUseCase(),
    setSliderStatus: createUnusedUseCase(),
    setShippingZoneRuleStatus: createUnusedUseCase(),
    setShippingZoneStatus: createUnusedUseCase(),
    updateCategoryShippingRule: createUnusedUseCase(),
    updateFreeShippingRule: createUnusedUseCase(),
    updateShippingZone: createUnusedUseCase(),
    updateShippingZoneRule: createUnusedUseCase(),
    updateShippingSettings: createUnusedUseCase(),
    updateOrderItemDeliveryStatus: createUnusedUseCase(),
    updateSlider: createUnusedUseCase(),
    updateProductBrand: createUnusedUseCase(),
    updateProductCategory: createUnusedUseCase(),
    ...overrides
  } as Parameters<typeof createAdminRouter>[0];
}

async function createServer(
  dependencies: Parameters<typeof createAdminRouter>[0]
) {
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.authUser = {
      sub: "admin-1",
      role: "admin"
    };
    next();
  });
  app.use("/admin", createAdminRouter(dependencies));

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

describe("admin order routes", () => {
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

  it("returns paginated admin order history", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const { server, baseUrl } = await createServer(
      createAdminRouterDependencies({
        listOrders: {
          execute: jest.fn(async () => ({
            items: [
              {
                id: "order-1",
                buyerId: "buyer-1",
                status: "pending_fulfillment" as const,
                shippingMode: "PLATFORM" as const,
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
        }
      })
    );
    openServers.push(server);

    const response = await fetch(`${baseUrl}/admin/orders?page=1&limit=20`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.orders[0]).toEqual(
      expect.objectContaining({
        id: "order-1",
        buyer_id: "buyer-1",
        status: "pending_fulfillment",
        items_preview: [
          expect.objectContaining({
            delivery_status: "pending_fulfillment"
          })
        ]
      })
    );
  });

  it("returns full admin order detail with item delivery fields", async () => {
    const { server, baseUrl } = await createServer(
      createAdminRouterDependencies({
        getOrderDetail: {
          execute: jest.fn(async () => ({
            id: "order-1",
            checkoutSessionId: "session-1",
            buyerId: "buyer-1",
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
            ],
            shippingSegments: []
          }))
        }
      })
    );
    openServers.push(server);

    const response = await fetch(`${baseUrl}/admin/orders/order-1`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({
        buyer_id: "buyer-1",
        items: [
          expect.objectContaining({
            delivery_status: "pending_fulfillment",
            shipped_at: null
          })
        ]
      })
    );
  });

  it("returns updated admin order detail after item delivery-status updates", async () => {
    const { server, baseUrl } = await createServer(
      createAdminRouterDependencies({
        updateOrderItemDeliveryStatus: {
          execute: jest.fn(async () => ({
            id: "order-1",
            checkoutSessionId: "session-1",
            buyerId: "buyer-1",
            paymentProvider: "paystack",
            paymentReference: "chk_1",
            status: "shipped" as const,
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
            updatedAt: new Date("2026-04-06T12:00:00.000Z"),
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
                deliveryStatusUpdatedByUserId: "admin-1",
                deliveryStatusUpdatedByRole: "admin" as const,
                shippedAt: new Date("2026-04-06T12:00:00.000Z"),
                deliveredAt: null,
                deliveryFailedAt: null,
                deliveryFailureReason: null,
                images: [],
                createdAt: new Date("2026-04-06T10:00:00.000Z"),
                updatedAt: new Date("2026-04-06T12:00:00.000Z")
              }
            ],
            shippingSegments: []
          }))
        }
      })
    );
    openServers.push(server);

    const response = await fetch(
      `${baseUrl}/admin/orders/items/order-item-1/delivery-status`,
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

  it("maps admin order application errors to HTTP responses", async () => {
    const { server, baseUrl } = await createServer(
      createAdminRouterDependencies({
        listOrders: {
          execute: jest.fn(async () => {
            throw new ListOrdersError("Limit must be between 1 and 100.", 400, "limit");
          })
        },
        getOrderDetail: {
          execute: jest.fn(async () => {
            throw new GetOrderDetailError("Order not found.", 404, "orderId");
          })
        },
        updateOrderItemDeliveryStatus: {
          execute: jest.fn(async () => {
            throw new UpdateOrderItemDeliveryStatusError(
              "Delivery failure reason is required when delivery status is delivery_failed.",
              400,
              "delivery_failure_reason"
            );
          })
        }
      })
    );
    openServers.push(server);

    const listResponse = await fetch(`${baseUrl}/admin/orders?page=1&limit=200`);
    expect(listResponse.status).toBe(400);

    const detailResponse = await fetch(`${baseUrl}/admin/orders/order-1`);
    expect(detailResponse.status).toBe(404);

    const patchResponse = await fetch(
      `${baseUrl}/admin/orders/items/order-item-1/delivery-status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          delivery_status: "delivery_failed"
        })
      }
    );
    const patchBody = await patchResponse.json();

    expect(patchResponse.status).toBe(400);
    expect(patchBody).toEqual({
      message:
        "Delivery failure reason is required when delivery status is delivery_failed.",
      field: "delivery_failure_reason"
    });
  });
});
