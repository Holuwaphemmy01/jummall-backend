import { afterEach, describe, expect, it, jest } from "@jest/globals";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { HandlePaystackWebhookError } from "../../../src/application/checkout/handle-paystack-webhook";
import { createPaymentRouter } from "../../../src/infrastructure/api/routes/payment-routes";

async function createServer(handlePaystackWebhook: { execute: jest.Mock }) {
  const app = express();
  app.use(
    express.json({
      verify: (req, _res, buffer) => {
        (req as typeof req & { rawBody?: string }).rawBody = buffer.toString();
      }
    })
  );
  app.use("/payments", createPaymentRouter({ handlePaystackWebhook: handlePaystackWebhook as never }));

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

describe("paystack webhook route", () => {
  const openServers: Server[] = [];

  afterEach(async () => {
    while (openServers.length > 0) {
      const server = openServers.pop();

      if (server) {
        await closeServer(server);
      }
    }
  });

  it("returns a processed webhook response", async () => {
    const handlePaystackWebhook = {
      execute: jest.fn(async () => ({
        processed: true,
        ignored: false,
        checkoutReference: "chk_1",
        orderId: "order-1"
      }))
    };
    const { server, baseUrl } = await createServer(handlePaystackWebhook);
    openServers.push(server);

    const response = await fetch(`${baseUrl}/payments/paystack/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": "signature"
      },
      body: JSON.stringify({
        event: "charge.success",
        data: {
          reference: "chk_1"
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      message: "Webhook processed successfully.",
      data: {
        processed: true,
        ignored: false,
        checkout_reference: "chk_1",
        order_id: "order-1"
      }
    });
  });

  it("maps webhook errors to the HTTP response", async () => {
    const handlePaystackWebhook = {
      execute: jest.fn(async () => {
        throw new HandlePaystackWebhookError("Invalid webhook signature.", 401);
      })
    };
    const { server, baseUrl } = await createServer(handlePaystackWebhook);
    openServers.push(server);

    const response = await fetch(`${baseUrl}/payments/paystack/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": "bad"
      },
      body: JSON.stringify({
        event: "charge.success",
        data: {
          reference: "chk_1"
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      message: "Invalid webhook signature.",
      field: undefined
    });
  });
});

