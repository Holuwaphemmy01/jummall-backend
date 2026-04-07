import type {
  OrderItemDeliveryStatus,
  OrderStatus
} from "../../ports/order-repository";

export const ORDER_ITEM_DELIVERY_STATUSES = [
  "pending_fulfillment",
  "shipped",
  "delivered",
  "delivery_failed"
] as const satisfies ReadonlyArray<OrderItemDeliveryStatus>;

export function deriveOrderStatus(
  statuses: OrderItemDeliveryStatus[]
): OrderStatus {
  if (statuses.length === 0) {
    return "pending_fulfillment";
  }

  if (statuses.every((status) => status === "pending_fulfillment")) {
    return "pending_fulfillment";
  }

  if (statuses.every((status) => status === "shipped")) {
    return "shipped";
  }

  if (statuses.every((status) => status === "delivered")) {
    return "delivered";
  }

  if (statuses.every((status) => status === "delivery_failed")) {
    return "delivery_failed";
  }

  if (
    statuses.some((status) => status === "delivered") &&
    !statuses.every((status) => status === "delivered")
  ) {
    return "partially_delivered";
  }

  return "partially_shipped";
}

export function canTransitionOrderItemDeliveryStatus(
  currentStatus: OrderItemDeliveryStatus,
  nextStatus: OrderItemDeliveryStatus
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  switch (currentStatus) {
    case "pending_fulfillment":
      return nextStatus === "shipped" || nextStatus === "delivery_failed";
    case "shipped":
      return nextStatus === "delivered" || nextStatus === "delivery_failed";
    case "delivery_failed":
      return nextStatus === "shipped";
    case "delivered":
      return false;
    default:
      return false;
  }
}
