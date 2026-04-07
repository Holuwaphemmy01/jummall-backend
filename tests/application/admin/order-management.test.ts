import { describe, expect, it, jest } from "@jest/globals";

import { GetOrderDetail } from "../../../src/application/admin/get-order-detail";
import { ListOrders } from "../../../src/application/admin/list-orders";
import {
  UpdateOrderItemDeliveryStatus,
  UpdateOrderItemDeliveryStatusError
} from "../../../src/application/admin/update-order-item-delivery-status";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  OrderDetailRecord,
  OrderHistoryPage,
  OrderRepository
} from "../../../src/ports/order-repository";

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  constructor(private readonly user: AuthUser | null = makeAdmin()) {}

  async findByEmail(): Promise<AuthUser | null> {
    return null;
  }

  async findById(): Promise<AuthUser | null> {
    return this.user;
  }

  async updatePassword(): Promise<void> {}
}

class OrderRepositoryDouble implements OrderRepository {
  updateItemDeliveryStatus = jest.fn(async () => undefined);

  constructor(
    private readonly options: {
      page?: OrderHistoryPage;
      order?: OrderDetailRecord | null;
      itemContext?: Awaited<ReturnType<OrderRepository["findItemDeliveryContextById"]>>;
    } = {}
  ) {}

  async create(): Promise<never> {
    throw new Error("Not implemented.");
  }

  async findById() {
    return this.options.order ?? makeOrderDetail();
  }

  async findDetailByIdAndBuyerId() {
    return this.options.order ?? makeOrderDetail();
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
    return this.options.page ?? makeOrderHistoryPage();
  }

  async findItemDeliveryContextById() {
    return (
      this.options.itemContext ?? {
        id: "order-item-1",
        orderId: "order-1",
        sellerId: "seller-1",
        shippingMode: "PLATFORM" as const,
        deliveryStatus: "pending_fulfillment" as const
      }
    );
  }
}

describe("admin order management", () => {
  it("lists marketplace orders", async () => {
    const useCase = new ListOrders(
      new AuthenticationRepositoryDouble(),
      new OrderRepositoryDouble()
    );

    const result = await useCase.execute({
      adminId: "admin-1",
      page: 1,
      limit: 20
    });

    expect(result.items[0]).toMatchObject({
      id: "order-1",
      buyerId: "buyer-1",
      status: "pending_fulfillment"
    });
  });

  it("returns one order detail for admin review", async () => {
    const useCase = new GetOrderDetail(
      new AuthenticationRepositoryDouble(),
      new OrderRepositoryDouble()
    );

    const result = await useCase.execute({
      adminId: "admin-1",
      orderId: "order-1"
    });

    expect(result.items[0]).toMatchObject({
      id: "order-item-1",
      deliveryStatus: "pending_fulfillment"
    });
  });

  it("updates item delivery status as admin", async () => {
    const orderRepository = new OrderRepositoryDouble({
      order: {
        ...makeOrderDetail(),
        status: "shipped",
        items: [
          {
            ...makeOrderDetail().items[0],
            deliveryStatus: "shipped",
            shippedAt: new Date("2026-04-06T12:00:00.000Z")
          }
        ]
      }
    });
    const useCase = new UpdateOrderItemDeliveryStatus(
      new AuthenticationRepositoryDouble(),
      orderRepository
    );

    const result = await useCase.execute({
      adminId: "admin-1",
      orderItemId: "order-item-1",
      deliveryStatus: "shipped"
    });

    expect(orderRepository.updateItemDeliveryStatus).toHaveBeenCalled();
    expect(
      (orderRepository.updateItemDeliveryStatus as jest.Mock).mock.calls[0][0]
    ).toMatchObject({
      orderItemId: "order-item-1",
      deliveryStatus: "shipped",
      updatedByUserId: "admin-1",
      updatedByRole: "admin"
    });
    expect(result.status).toBe("shipped");
  });

  it("requires a failure reason for delivery_failed updates", async () => {
    const useCase = new UpdateOrderItemDeliveryStatus(
      new AuthenticationRepositoryDouble(),
      new OrderRepositoryDouble()
    );

    await expect(
      useCase.execute({
        adminId: "admin-1",
        orderItemId: "order-item-1",
        deliveryStatus: "delivery_failed"
      })
    ).rejects.toBeInstanceOf(UpdateOrderItemDeliveryStatusError);
  });

  it("rejects invalid transitions from delivered", async () => {
    const useCase = new UpdateOrderItemDeliveryStatus(
      new AuthenticationRepositoryDouble(),
      new OrderRepositoryDouble({
        itemContext: {
          id: "order-item-1",
          orderId: "order-1",
          sellerId: "seller-1",
          shippingMode: "PLATFORM",
          deliveryStatus: "delivered"
        }
      })
    );

    await expect(
      useCase.execute({
        adminId: "admin-1",
        orderItemId: "order-item-1",
        deliveryStatus: "shipped"
      })
    ).rejects.toBeInstanceOf(UpdateOrderItemDeliveryStatusError);
  });
});

function makeAdmin(): AuthUser {
  return {
    id: "admin-1",
    firstName: "Admin",
    lastName: "One",
    username: "adminone",
    email: "admin@example.com",
    phone: null,
    passwordHash: "hash",
    role: "admin",
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
        itemsPreview: [
          {
            orderItemId: "order-item-1",
            productId: "product-1",
            productName: "Phone",
            quantity: 1,
            deliveryStatus: "pending_fulfillment",
            images: []
          }
        ]
      }
    ],
    total: 1,
    page: 1,
    limit: 20
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
        images: [],
        createdAt: new Date("2026-04-06T10:00:00.000Z"),
        updatedAt: new Date("2026-04-06T10:00:00.000Z")
      }
    ],
    shippingSegments: []
  };
}
