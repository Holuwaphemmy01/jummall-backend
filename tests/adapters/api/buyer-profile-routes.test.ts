import { afterEach, describe, expect, it, jest } from "@jest/globals";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { UpdateBuyerProfileError } from "../../../src/application/buyer/update-buyer-profile";
import { createProtectedBuyerProfileRouter } from "../../../src/infrastructure/api/routes/buyer-routes";

async function createServer(
  dependencies: Parameters<typeof createProtectedBuyerProfileRouter>[0]
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
  app.use("/buyers/profile", createProtectedBuyerProfileRouter(dependencies));

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

describe("buyer profile routes", () => {
  const openServers: Server[] = [];

  afterEach(async () => {
    while (openServers.length > 0) {
      const server = openServers.pop();

      if (server) {
        await closeServer(server);
      }
    }
  });

  it("updates a buyer profile and returns the existing profile shape", async () => {
    const updateBuyerProfileExecute = jest.fn(async () => ({
      id: "buyer-id",
      firstName: "Jane",
      lastName: "Doe",
      username: "john.doe",
      email: "john@example.com",
      phone: "+2348099999999",
      role: "buyer",
      accountStatus: "verified",
      createdAt: new Date("2026-04-08T00:00:00.000Z"),
      updatedAt: new Date("2026-04-08T12:00:00.000Z")
    }));
    const { server, baseUrl } = await createServer({
      updateBuyerProfile: {
        execute: updateBuyerProfileExecute
      } as never
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        first_name: "Jane",
        phone: "+2348099999999"
      })
    });
    const body = await response.json();
    const updateBuyerProfileCall =
      (updateBuyerProfileExecute.mock.calls as unknown[][])[0]?.[0];

    expect(response.status).toBe(200);
    expect(updateBuyerProfileCall).toEqual({
      buyerId: "buyer-id",
      firstName: "Jane",
      lastName: undefined,
      phone: "+2348099999999"
    });
    expect(body).toEqual({
      message: "Buyer profile updated successfully.",
      data: {
        id: "buyer-id",
        first_name: "Jane",
        last_name: "Doe",
        username: "john.doe",
        email: "john@example.com",
        phone: "+2348099999999",
        role: "buyer",
        account_status: "verified",
        account_type: null,
        kyc_status: null
      }
    });
  });

  it("rejects attempts to update username or email", async () => {
    const { server, baseUrl } = await createServer({
      updateBuyerProfile: {
        execute: jest.fn()
      } as never
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: "new.username"
      })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Validation failed.");
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "username"
        })
      ])
    );
  });

  it("maps update profile use case errors to the HTTP response", async () => {
    const { server, baseUrl } = await createServer({
      updateBuyerProfile: {
        execute: jest.fn(async () => {
          throw new UpdateBuyerProfileError("Phone is already in use.", 409, "phone");
        })
      } as never
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/buyers/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone: "+2348099999999"
      })
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      message: "Phone is already in use.",
      field: "phone"
    });
  });
});
