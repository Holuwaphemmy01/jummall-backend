import { afterEach, describe, expect, it, jest } from "@jest/globals";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import {
  CalculateCartShippingError,
  type CalculateCartShippingResult,
  type CalculateCartShippingUseCase
} from "../../../src/application/shipping/calculate-cart-shipping";
import { createProtectedBuyerCartRouter } from "../../../src/infrastructure/api/routes/buyer-routes";

function createUnusedUseCase() {
  return {
    execute: jest.fn(async () => {
      throw new Error("Unexpected use case call.");
    })
  };
}

function makeShippingPreviewResult(): CalculateCartShippingResult {
  return {
    cartId: "cart-id",
    currency: "NGN",
    rawSubtotal: 60000,
    discountedSubtotal: 58000,
    totalItems: 2,
    shippingMode: "VENDOR",
    categoryShippingMode: "ADDITIVE",
    baseShippingFee: 4500,
    finalShippingFee: 0,
    freeShipping: {
      applied: true,
      ruleId: "free-rule-id",
      ruleType: "coupon",
      couponCode: "FREESHIP"
    },
    breakdown: [
      {
        sellerId: "seller-id",
        ruleOwnerType: "vendor",
        finalShippingOwnerType: "platform",
        usedFallback: false,
        matchedZone: {
          id: "zone-id",
          name: "Lagos Urban",
          matchType: "city"
        },
        zoneFee: 2500,
        categoryFee: 1500,
        baseShippingFee: 2500,
        finalShippingFee: 0
      }
    ]
  };
}

async function createServer(
  calculateCartShipping: CalculateCartShippingUseCase
): Promise<{ server: Server; baseUrl: string }> {
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
      getActiveCart: createUnusedUseCase() as never,
      addProductToCart: createUnusedUseCase() as never,
      calculateCartShipping,
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

describe("buyer cart shipping preview route", () => {
  const openServers: Server[] = [];

  afterEach(async () => {
    while (openServers.length > 0) {
      const server = openServers.pop();

      if (server) {
        await closeServer(server);
      }
    }
  });

  it("returns validation errors for an invalid request body", async () => {
    const calculateCartShipping = {
      execute: jest.fn()
    } as unknown as CalculateCartShippingUseCase;

    const { server, baseUrl } = await createServer(calculateCartShipping);
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/cart/shipping-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      message: "Validation failed.",
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: "billing_address_id"
        })
      ])
    });
    expect((calculateCartShipping.execute as jest.Mock)).not.toHaveBeenCalled();
  });

  it("returns a shipping preview and maps the use case result to snake_case", async () => {
    const result = makeShippingPreviewResult();
    const calculateCartShipping = {
      execute: jest.fn(async () => result)
    } as unknown as CalculateCartShippingUseCase;

    const { server, baseUrl } = await createServer(calculateCartShipping);
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/cart/shipping-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        billing_address_id: "billing-address-id",
        free_shipping_coupon_code: "FREESHIP"
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(calculateCartShipping.execute).toHaveBeenCalledWith({
      buyerId: "buyer-id",
      billingAddressId: "billing-address-id",
      freeShippingCouponCode: "FREESHIP"
    });
    expect(body).toEqual({
      message: "Shipping preview calculated successfully.",
      data: {
        cart_id: "cart-id",
        currency: "NGN",
        raw_subtotal: 60000,
        discounted_subtotal: 58000,
        total_items: 2,
        shipping_mode: "VENDOR",
        category_shipping_mode: "ADDITIVE",
        base_shipping_fee: 4500,
        final_shipping_fee: 0,
        free_shipping: {
          applied: true,
          rule_id: "free-rule-id",
          rule_type: "coupon",
          coupon_code: "FREESHIP"
        },
        breakdown: [
          {
            seller_id: "seller-id",
            rule_owner_type: "vendor",
            final_shipping_owner_type: "platform",
            used_fallback: false,
            matched_zone: {
              id: "zone-id",
              name: "Lagos Urban",
              match_type: "city"
            },
            zone_fee: 2500,
            category_fee: 1500,
            base_shipping_fee: 2500,
            final_shipping_fee: 0
          }
        ]
      }
    });
  });

  it("maps calculate-cart-shipping application errors to the HTTP response", async () => {
    const calculateCartShipping = {
      execute: jest.fn(async () => {
        throw new CalculateCartShippingError(
          "Free shipping coupon is invalid or inactive.",
          400,
          "free_shipping_coupon_code"
        );
      })
    } as unknown as CalculateCartShippingUseCase;

    const { server, baseUrl } = await createServer(calculateCartShipping);
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/cart/shipping-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        billing_address_id: "billing-address-id",
        free_shipping_coupon_code: "BADCODE"
      })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      message: "Free shipping coupon is invalid or inactive.",
      field: "free_shipping_coupon_code"
    });
  });
});
