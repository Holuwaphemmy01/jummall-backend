import { describe, expect, it } from "@jest/globals";

import {
  ListBuyerOrders,
  ListBuyerOrdersError
} from "../../../src/application/buyer/list-buyer-orders";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  FindOrdersPageByBuyerIdInput,
  OrderHistoryPage,
  OrderRepository
} from "../../../src/ports/order-repository";

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  constructor(private readonly user: AuthUser | null = makeBuyer()) {}

  async findByEmail(): Promise<AuthUser | null> {
    return null;
  }

  async findById(): Promise<AuthUser | null> {
    return this.user;
  }

  async updatePassword(): Promise<void> {}
}

class OrderRepositoryDouble implements OrderRepository {
  constructor(private readonly page: OrderHistoryPage = makeOrderHistoryPage()) {}

  async create(): Promise<never> {
    throw new Error("Not implemented.");
  }

  async findById() {
    return null;
  }

  async findDetailByIdAndBuyerId() {
    return null;
  }

  async findDetailByIdAndSellerId() {
    return null;
  }

  async findPageByBuyerId(input: FindOrdersPageByBuyerIdInput): Promise<OrderHistoryPage> {
    return {
      ...this.page,
      page: input.page,
      limit: input.limit
    };
  }

  async findPageBySellerId() {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 20
    };
  }

  async findPage() {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 20
    };
  }

  async findItemDeliveryContextById() {
    return null;
  }

  async updateItemDeliveryStatus(): Promise<void> {}
}

describe("list buyer orders", () => {
  it("returns paginated order history for a buyer", async () => {
    const useCase = new ListBuyerOrders(
      new AuthenticationRepositoryDouble(),
      new OrderRepositoryDouble()
    );

    const result = await useCase.execute({
      buyerId: "buyer-1",
      page: 2,
      limit: 10
    });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.items[0]).toMatchObject({
      id: "order-1",
      totalPaid: 10500
    });
  });

  it("returns an empty order list when the buyer has no orders", async () => {
    const useCase = new ListBuyerOrders(
      new AuthenticationRepositoryDouble(),
      new OrderRepositoryDouble({
        items: [],
        total: 0,
        page: 1,
        limit: 20
      })
    );

    const result = await useCase.execute({
      buyerId: "buyer-1"
    });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("rejects an invalid pagination input", async () => {
    const useCase = new ListBuyerOrders(
      new AuthenticationRepositoryDouble(),
      new OrderRepositoryDouble()
    );

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        page: 0
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Page must be greater than or equal to 1.",
        statusCode: 400,
        field: "page"
      })
    );
  });
});

function makeBuyer(): AuthUser {
  return {
    id: "buyer-1",
    firstName: "Buyer",
    lastName: "One",
    username: "buyerone",
    email: "buyer@example.com",
    phone: null,
    passwordHash: "hash",
    role: "buyer",
    accountStatus: "active",
    createdAt: new Date("2026-04-06T00:00:00.000Z"),
    updatedAt: new Date("2026-04-06T00:00:00.000Z")
  };
}

function makeOrderHistoryPage(): OrderHistoryPage {
  return {
    items: [
      {
        id: "order-1",
        buyerId: "buyer-1",
        status: "pending_fulfillment",
        shippingMode: "PLATFORM",
        currency: "NGN",
        totalItems: 1,
        rawSubtotal: 10000,
        discountedSubtotal: 10000,
        finalShippingFee: 500,
        totalPaid: 10500,
        freeShippingApplied: false,
        paidAt: new Date("2026-04-06T10:00:00.000Z"),
        createdAt: new Date("2026-04-06T10:00:00.000Z"),
        itemsPreview: []
      }
    ],
    total: 1,
    page: 1,
    limit: 20
  };
}
