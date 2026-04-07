import { describe, expect, it } from "@jest/globals";

import {
  canTransitionOrderItemDeliveryStatus,
  deriveOrderStatus
} from "../../../src/application/order/order-delivery-status";

describe("order delivery status helpers", () => {
  it("derives partially delivered when any item is delivered but not all items are delivered", () => {
    expect(
      deriveOrderStatus(["delivered", "shipped", "delivery_failed"])
    ).toBe("partially_delivered");
  });

  it("derives partially shipped for mixed in-progress non-delivered item states", () => {
    expect(
      deriveOrderStatus(["pending_fulfillment", "shipped", "delivery_failed"])
    ).toBe("partially_shipped");
  });

  it("allows only the configured item delivery status transitions", () => {
    expect(
      canTransitionOrderItemDeliveryStatus("pending_fulfillment", "shipped")
    ).toBe(true);
    expect(
      canTransitionOrderItemDeliveryStatus("delivery_failed", "shipped")
    ).toBe(true);
    expect(
      canTransitionOrderItemDeliveryStatus("shipped", "delivered")
    ).toBe(true);
    expect(
      canTransitionOrderItemDeliveryStatus("delivered", "shipped")
    ).toBe(false);
    expect(
      canTransitionOrderItemDeliveryStatus(
        "pending_fulfillment",
        "delivered"
      )
    ).toBe(false);
  });
});
