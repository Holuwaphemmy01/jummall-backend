import { afterEach, describe, expect, it, jest } from "@jest/globals";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { GetCheckoutStatusError } from "../../../src/application/checkout/get-checkout-status";
import { GetOrderSummaryError } from "../../../src/application/checkout/get-order-summary";
import { InitializeCheckoutError } from "../../../src/application/checkout/initialize-checkout";
import { createProtectedBuyerCartRouter } from "../../../src/infrastructure/api/routes/buyer-routes";

function createUnusedUseCase() {
  return {
    execute: jest.fn(async () => {
      throw new Error("Unexpected use case call.");
    })
  };
}

async function createServer(dependencies: Parameters<typeof createProtectedBuyerCartRouter>[0]) {
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.authUser = {
      sub: "buyer-id",
      role: "buyer"
    };
    next();
  });
  app.use("/buyers/cart", createProtectedBuyerCartRouter(dependencies));

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

describe("buyer checkout routes", () => {
  const openServers: Server[] = [];

  afterEach(async () => {
    while (openServers.length > 0) {
      const server = openServers.pop();

      if (server) {
        await closeServer(server);
      }
    }
  });

  it("returns an order summary payload in snake_case", async () => {
    const getOrderSummary = {
      execute: jest.fn(async () => ({
        summary: {
          cartId: "cart-id",
          billingAddress: {
            id: "address-id",
            fullName: "Buyer One",
            phoneNumber: "08000000000",
            addressLine1: "1 Buyer St",
            addressLine2: null,
            city: "Ikeja",
            state: "Lagos",
            country: "Nigeria",
            postalCode: null
          },
          items: [],
          currency: "NGN",
          totalItems: 1,
          rawSubtotal: 10000,
          discountedSubtotal: 9500,
          shippingMode: "PLATFORM",
          categoryShippingMode: "HIGHEST",
          baseShippingFee: 1000,
          finalShippingFee: 1000,
          totalPayable: 10500,
          freeShipping: {
            applied: false,
            ruleId: null,
            ruleType: null,
            couponCode: null
          },
          shippingBreakdown: []
        }
      }))
    };
    const { server, baseUrl } = await createServer({
      clearBuyerCart: createUnusedUseCase() as never,
      getActiveCart: createUnusedUseCase() as never,
      addProductToCart: createUnusedUseCase() as never,
      calculateCartShipping: createUnusedUseCase() as never,
      getOrderSummary: getOrderSummary as never,
      initializeCheckout: createUnusedUseCase() as never,
      getCheckoutStatus: createUnusedUseCase() as never,
      removeProductFromCart: createUnusedUseCase() as never,
      updateProductQuantityInCart: createUnusedUseCase() as never
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/cart/order-summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        billing_address_id: "address-id",
        discounted_subtotal: 9500
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({
        cart_id: "cart-id",
        total_payable: 10500,
        billing_address: expect.objectContaining({
          full_name: "Buyer One"
        })
      })
    );
  });

  it("returns the initialized checkout payload", async () => {
    const initializeCheckout = {
      execute: jest.fn(async () => ({
        checkoutReference: "chk_1",
        authorizationUrl: "https://paystack.test/authorize",
        accessCode: "access-code",
        summary: {
          cartId: "cart-id",
          billingAddress: {
            id: "address-id",
            fullName: "Buyer One",
            phoneNumber: "08000000000",
            addressLine1: "1 Buyer St",
            addressLine2: null,
            city: "Ikeja",
            state: "Lagos",
            country: "Nigeria",
            postalCode: null
          },
          items: [],
          currency: "NGN",
          totalItems: 1,
          rawSubtotal: 10000,
          discountedSubtotal: 9500,
          shippingMode: "PLATFORM",
          categoryShippingMode: "HIGHEST",
          baseShippingFee: 1000,
          finalShippingFee: 1000,
          totalPayable: 10500,
          freeShipping: {
            applied: false,
            ruleId: null,
            ruleType: null,
            couponCode: null
          },
          shippingBreakdown: []
        }
      }))
    };
    const { server, baseUrl } = await createServer({
      clearBuyerCart: createUnusedUseCase() as never,
      getActiveCart: createUnusedUseCase() as never,
      addProductToCart: createUnusedUseCase() as never,
      calculateCartShipping: createUnusedUseCase() as never,
      getOrderSummary: createUnusedUseCase() as never,
      initializeCheckout: initializeCheckout as never,
      getCheckoutStatus: createUnusedUseCase() as never,
      removeProductFromCart: createUnusedUseCase() as never,
      updateProductQuantityInCart: createUnusedUseCase() as never
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/cart/checkout/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        billing_address_id: "address-id",
        discounted_subtotal: 9500
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({
        checkout_reference: "chk_1",
        authorization_url: "https://paystack.test/authorize",
        access_code: "access-code"
      })
    );
  });

  it("maps checkout status errors to the HTTP response", async () => {
    const getCheckoutStatus = {
      execute: jest.fn(async () => {
        throw new GetCheckoutStatusError("Checkout session not found.", 404, "reference");
      })
    };
    const { server, baseUrl } = await createServer({
      clearBuyerCart: createUnusedUseCase() as never,
      getActiveCart: createUnusedUseCase() as never,
      addProductToCart: createUnusedUseCase() as never,
      calculateCartShipping: createUnusedUseCase() as never,
      getOrderSummary: createUnusedUseCase() as never,
      initializeCheckout: createUnusedUseCase() as never,
      getCheckoutStatus: getCheckoutStatus as never,
      removeProductFromCart: createUnusedUseCase() as never,
      updateProductQuantityInCart: createUnusedUseCase() as never
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/cart/checkout/missing-ref`);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      message: "Checkout session not found.",
      field: "reference"
    });
  });
});

