import { describe, expect, it, jest } from "@jest/globals";

import { GetSellerOrderDetail } from "../../../src/application/seller/get-order-detail";
import { ListSellerOrders } from "../../../src/application/seller/list-orders";
import {
  UpdateSellerOrderItemDeliveryStatus,
  UpdateSellerOrderItemDeliveryStatusError
} from "../../../src/application/seller/update-order-item-delivery-status";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  OrderRepository,
  SellerOrderDetailRecord,
  SellerOrderHistoryPage
} from "../../../src/ports/order-repository";

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  constructor(private readonly user: AuthUser | null = makeSeller()) {}

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
      sellerPage?: SellerOrderHistoryPage;
      sellerOrder?: SellerOrderDetailRecord | null;
      itemContext?: Awaited<ReturnType<OrderRepository["findItemDeliveryContextById"]>>;
    } = {}
  ) {}

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
    return this.options.sellerOrder ?? makeSellerOrderDetail();
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
    return this.options.sellerPage ?? makeSellerOrderHistoryPage();
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
    return (
      this.options.itemContext ?? {
        id: "order-item-1",
        orderId: "order-1",
        sellerId: "seller-1",
        shippingMode: "VENDOR" as const,
        deliveryStatus: "pending_fulfillment" as const
      }
    );
  }
}

describe("seller order management", () => {
  it("lists seller-scoped orders", async () => {
    const useCase = new ListSellerOrders(
      new AuthenticationRepositoryDouble(),
      new OrderRepositoryDouble()
    );

    const result = await useCase.execute({
      sellerId: "seller-1",
      page: 1,
      limit: 20
    });

    expect(result.items[0]).toMatchObject({
      id: "order-1",
      status: "pending_fulfillment",
      subtotal: 10000
    });
  });

  it("returns a seller-owned order detail", async () => {
    const useCase = new GetSellerOrderDetail(
      new AuthenticationRepositoryDouble(),
      new OrderRepositoryDouble()
    );

    const result = await useCase.execute({
      sellerId: "seller-1",
      orderId: "order-1"
    });

    expect(result.items[0]).toMatchObject({
      id: "order-item-1",
      deliveryStatus: "pending_fulfillment"
    });
  });

  it("prevents sellers from updating platform-handled logistics orders", async () => {
    const useCase = new UpdateSellerOrderItemDeliveryStatus(
      new AuthenticationRepositoryDouble(),
      new OrderRepositoryDouble({
        itemContext: {
          id: "order-item-1",
          orderId: "order-1",
          sellerId: "seller-1",
          shippingMode: "PLATFORM",
          deliveryStatus: "pending_fulfillment"
        }
      })
    );

    await expect(
      useCase.execute({
        sellerId: "seller-1",
        orderItemId: "order-item-1",
        deliveryStatus: "shipped"
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message:
          "Only admin can update delivery status for platform-handled logistics orders.",
        statusCode: 403
      })
    );
  });

  it("updates delivery status for vendor-handled seller items", async () => {
    const orderRepository = new OrderRepositoryDouble({
      sellerOrder: {
        ...makeSellerOrderDetail(),
        status: "shipped",
        items: [
          {
            ...makeSellerOrderDetail().items[0],
            deliveryStatus: "shipped",
            shippedAt: new Date("2026-04-06T12:00:00.000Z")
          }
        ]
      }
    });
    const useCase = new UpdateSellerOrderItemDeliveryStatus(
      new AuthenticationRepositoryDouble(),
      orderRepository
    );

    const result = await useCase.execute({
      sellerId: "seller-1",
      orderItemId: "order-item-1",
      deliveryStatus: "shipped"
    });

    expect(orderRepository.updateItemDeliveryStatus).toHaveBeenCalled();
    expect(
      (orderRepository.updateItemDeliveryStatus as jest.Mock).mock.calls[0][0]
    ).toMatchObject({
      orderItemId: "order-item-1",
      deliveryStatus: "shipped",
      updatedByUserId: "seller-1",
      updatedByRole: "seller"
    });
    expect(result.status).toBe("shipped");
  });

  it("rejects invalid item delivery status transitions", async () => {
    const useCase = new UpdateSellerOrderItemDeliveryStatus(
      new AuthenticationRepositoryDouble(),
      new OrderRepositoryDouble({
        itemContext: {
          id: "order-item-1",
          orderId: "order-1",
          sellerId: "seller-1",
          shippingMode: "VENDOR",
          deliveryStatus: "delivered"
        }
      })
    );

    await expect(
      useCase.execute({
        sellerId: "seller-1",
        orderItemId: "order-item-1",
        deliveryStatus: "shipped"
      })
    ).rejects.toBeInstanceOf(UpdateSellerOrderItemDeliveryStatusError);
  });
});

function makeSeller(): AuthUser {
  return {
    id: "seller-1",
    firstName: "Seller",
    lastName: "One",
    username: "sellerone",
    email: "seller@example.com",
    phone: null,
    passwordHash: "hash",
    role: "seller",
    accountStatus: "active",
    createdAt: new Date("2026-04-06T00:00:00.000Z"),
    updatedAt: new Date("2026-04-06T00:00:00.000Z")
  };
}

function makeSellerOrderHistoryPage(): SellerOrderHistoryPage {
  return {
    items: [
      {
        id: "order-1",
        status: "pending_fulfillment",
        shippingMode: "VENDOR",
        currency: "NGN",
        totalItems: 1,
        subtotal: 10000,
        canUpdateDeliveryStatus: true,
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

function makeSellerOrderDetail(): SellerOrderDetailRecord {
  return {
    id: "order-1",
    status: "pending_fulfillment",
    shippingMode: "VENDOR",
    currency: "NGN",
    totalItems: 1,
    subtotal: 10000,
    canUpdateDeliveryStatus: true,
    paidAt: new Date("2026-04-06T10:00:00.000Z"),
    createdAt: new Date("2026-04-06T10:00:00.000Z"),
    updatedAt: new Date("2026-04-06T10:00:00.000Z"),
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
    ]
  };
}
