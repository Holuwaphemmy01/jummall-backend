import { afterEach, describe, expect, it, jest } from "@jest/globals";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { UpdateBillingAddressError } from "../../../src/application/buyer/update-billing-address";
import { createProtectedBuyerBillingAddressRouter } from "../../../src/infrastructure/api/routes/buyer-routes";

function createUnusedUseCase() {
  return {
    execute: jest.fn(async () => {
      throw new Error("Unexpected use case call.");
    })
  };
}

async function createServer(
  dependencies: Parameters<typeof createProtectedBuyerBillingAddressRouter>[0]
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
  app.use(
    "/buyers/billing-addresses",
    createProtectedBuyerBillingAddressRouter(dependencies)
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

describe("buyer billing address routes", () => {
  const openServers: Server[] = [];

  afterEach(async () => {
    while (openServers.length > 0) {
      const server = openServers.pop();

      if (server) {
        await closeServer(server);
      }
    }
  });

  it("updates a billing address and returns snake_case response fields", async () => {
    const updateBillingAddressExecute = jest.fn(async () => ({
      id: "billing-address-id",
      buyerId: "buyer-id",
      fullName: "Buyer One",
      phoneNumber: "08000000000",
      addressLine1: "1 Buyer St",
      addressLine2: null,
      city: "Ikeja",
      state: "Lagos",
      country: "Nigeria",
      postalCode: null,
      createdAt: new Date("2026-04-08T00:00:00.000Z"),
      updatedAt: new Date("2026-04-08T12:00:00.000Z")
    }));
    const { server, baseUrl } = await createServer({
      addBillingAddress: createUnusedUseCase() as never,
      deleteBillingAddress: createUnusedUseCase() as never,
      getBillingAddresses: createUnusedUseCase() as never,
      updateBillingAddress: {
        execute: updateBillingAddressExecute
      } as never
    });
    openServers.push(server);

    const response = await fetch(
      `${baseUrl}/buyers/billing-addresses/billing-address-id`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          city: "Ikeja",
          address_line_2: ""
        })
      }
    );
    const body = await response.json();
    const updateBillingAddressCall =
      (updateBillingAddressExecute.mock.calls as unknown[][])[0]?.[0];

    expect(response.status).toBe(200);
    expect(updateBillingAddressCall).toEqual({
      buyerId: "buyer-id",
      billingAddressId: "billing-address-id",
      fullName: undefined,
      phoneNumber: undefined,
      addressLine1: undefined,
      addressLine2: null,
      city: "Ikeja",
      state: undefined,
      country: undefined,
      postalCode: undefined
    });
    expect(body).toEqual({
      message: "Billing address updated successfully.",
      data: {
        id: "billing-address-id",
        buyer_id: "buyer-id",
        full_name: "Buyer One",
        phone_number: "08000000000",
        address_line_1: "1 Buyer St",
        address_line_2: null,
        city: "Ikeja",
        state: "Lagos",
        country: "Nigeria",
        postal_code: null,
        created_at: "2026-04-08T00:00:00.000Z",
        updated_at: "2026-04-08T12:00:00.000Z"
      }
    });
  });

  it("rejects an empty update payload", async () => {
    const { server, baseUrl } = await createServer({
      addBillingAddress: createUnusedUseCase() as never,
      deleteBillingAddress: createUnusedUseCase() as never,
      getBillingAddresses: createUnusedUseCase() as never,
      updateBillingAddress: createUnusedUseCase() as never
    });
    openServers.push(server);

    const response = await fetch(
      `${baseUrl}/buyers/billing-addresses/billing-address-id`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Validation failed.");
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("must have at least 1 key")
        })
      ])
    );
  });

  it("maps update use case errors to the HTTP response", async () => {
    const { server, baseUrl } = await createServer({
      addBillingAddress: createUnusedUseCase() as never,
      deleteBillingAddress: createUnusedUseCase() as never,
      getBillingAddresses: createUnusedUseCase() as never,
      updateBillingAddress: {
        execute: jest.fn(async () => {
          throw new UpdateBillingAddressError(
            "Billing address not found.",
            404,
            "billing_address_id"
          );
        })
      } as never
    });
    openServers.push(server);

    const response = await fetch(
      `${baseUrl}/buyers/billing-addresses/missing-address-id`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          city: "Ikeja"
        })
      }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      message: "Billing address not found.",
      field: "billing_address_id"
    });
  });
});
