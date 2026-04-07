import { describe, expect, it } from "@jest/globals";

import {
  GetBuyerOrderDetail,
  GetBuyerOrderDetailError
} from "../../../src/application/buyer/get-buyer-order-detail";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type { OrderDetailRecord, OrderRepository } from "../../../src/ports/order-repository";

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
  constructor(private readonly order: OrderDetailRecord | null = makeOrderDetail()) {}

  async create(): Promise<never> {
    throw new Error("Not implemented.");
  }

  async findById() {
    return this.order;
  }

  async findDetailByIdAndBuyerId() {
    return this.order;
  }

  async findDetailByIdAndSellerId() {
    return null;
  }

  async findPageByBuyerId() {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 20
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

describe("get buyer order detail", () => {
  it("returns a buyer-owned order with its full detail", async () => {
    const useCase = new GetBuyerOrderDetail(
      new AuthenticationRepositoryDouble(),
      new OrderRepositoryDouble()
    );

    const result = await useCase.execute({
      buyerId: "buyer-1",
      orderId: "order-1"
    });

    expect(result.id).toBe("order-1");
    expect(result.items[0].images[0]).toMatchObject({
      storagePath: "products/seller-1/product-1/front.jpg"
    });
  });

  it("returns not found when the order does not belong to the buyer", async () => {
    const useCase = new GetBuyerOrderDetail(
      new AuthenticationRepositoryDouble(),
      new OrderRepositoryDouble(null)
    );

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        orderId: "order-1"
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Order not found.",
        statusCode: 404,
        field: "orderId"
      })
    );
  });

  it("returns legacy orders with empty item images", async () => {
    const useCase = new GetBuyerOrderDetail(
      new AuthenticationRepositoryDouble(),
      new OrderRepositoryDouble({
        ...makeOrderDetail(),
        items: [
          {
            ...makeOrderDetail().items[0],
            images: []
          }
        ]
      })
    );

    const result = await useCase.execute({
      buyerId: "buyer-1",
      orderId: "order-1"
    });

    expect(result.items[0].images).toEqual([]);
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

function makeOrderDetail(): OrderDetailRecord {
  return {
    id: "order-1",
    checkoutSessionId: "session-1",
    buyerId: "buyer-1",
    paymentProvider: "paystack",
    paymentReference: "chk_1",
    status: "pending_fulfillment",
    currency: "NGN",
    totalItems: 1,
    rawSubtotal: 10000,
    discountedSubtotal: 10000,
    baseShippingFee: 500,
    finalShippingFee: 500,
    totalPaid: 10500,
    shippingMode: "PLATFORM",
    categoryShippingMode: "HIGHEST",
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
        deliveryStatus: "pending_fulfillment",
        deliveryStatusUpdatedAt: null,
        deliveryStatusUpdatedByUserId: null,
        deliveryStatusUpdatedByRole: null,
        shippedAt: null,
        deliveredAt: null,
        deliveryFailedAt: null,
        deliveryFailureReason: null,
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
        ruleOwnerType: "platform",
        finalShippingOwnerType: "platform",
        usedFallback: false,
        matchedZoneId: "zone-1",
        matchedZoneName: "Lagos",
        matchedZoneMatchType: "state",
        zoneFee: 500,
        categoryFee: 0,
        baseShippingFee: 500,
        finalShippingFee: 500,
        createdAt: new Date("2026-04-06T10:00:00.000Z"),
        updatedAt: new Date("2026-04-06T10:00:00.000Z")
      }
    ]
  };
}
