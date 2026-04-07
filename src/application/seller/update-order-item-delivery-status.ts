import { canTransitionOrderItemDeliveryStatus } from "../order/order-delivery-status";
import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  OrderItemDeliveryStatus,
  OrderRepository,
  SellerOrderDetailRecord
} from "../../ports/order-repository";

export interface UpdateSellerOrderItemDeliveryStatusInput {
  sellerId: string;
  orderItemId: string;
  deliveryStatus: OrderItemDeliveryStatus;
  deliveryFailureReason?: string | null;
}

export interface UpdateSellerOrderItemDeliveryStatusUseCase {
  execute(
    input: UpdateSellerOrderItemDeliveryStatusInput
  ): Promise<SellerOrderDetailRecord>;
}

export class UpdateSellerOrderItemDeliveryStatusError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "UpdateSellerOrderItemDeliveryStatusError";
  }
}

export class UpdateSellerOrderItemDeliveryStatus
  implements UpdateSellerOrderItemDeliveryStatusUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly orderRepository: OrderRepository
  ) {}

  async execute(
    input: UpdateSellerOrderItemDeliveryStatusInput
  ): Promise<SellerOrderDetailRecord> {
    const seller = await this.authenticationRepository.findById(input.sellerId);

    if (!seller) {
      throw new UpdateSellerOrderItemDeliveryStatusError(
        "Seller account not found.",
        404,
        "seller_id"
      );
    }

    if (seller.role !== "seller") {
      throw new UpdateSellerOrderItemDeliveryStatusError(
        "Only sellers can update delivery statuses.",
        403,
        "seller_id"
      );
    }

    const orderItemId = input.orderItemId.trim();

    if (!orderItemId) {
      throw new UpdateSellerOrderItemDeliveryStatusError(
        "Order item id is required.",
        400,
        "orderItemId"
      );
    }

    const deliveryFailureReason = input.deliveryFailureReason?.trim() ?? null;

    if (input.deliveryStatus === "delivery_failed" && !deliveryFailureReason) {
      throw new UpdateSellerOrderItemDeliveryStatusError(
        "Delivery failure reason is required when delivery status is delivery_failed.",
        400,
        "delivery_failure_reason"
      );
    }

    if (input.deliveryStatus !== "delivery_failed" && deliveryFailureReason) {
      throw new UpdateSellerOrderItemDeliveryStatusError(
        "Delivery failure reason can only be provided when delivery status is delivery_failed.",
        400,
        "delivery_failure_reason"
      );
    }

    const orderItem = await this.orderRepository.findItemDeliveryContextById(
      orderItemId
    );

    if (!orderItem || orderItem.sellerId !== input.sellerId) {
      throw new UpdateSellerOrderItemDeliveryStatusError(
        "Order item not found.",
        404,
        "orderItemId"
      );
    }

    if (orderItem.shippingMode !== "VENDOR") {
      throw new UpdateSellerOrderItemDeliveryStatusError(
        "Only admin can update delivery status for platform-handled logistics orders.",
        403,
        "delivery_status"
      );
    }

    if (
      !canTransitionOrderItemDeliveryStatus(
        orderItem.deliveryStatus,
        input.deliveryStatus
      )
    ) {
      throw new UpdateSellerOrderItemDeliveryStatusError(
        `Cannot change delivery status from ${orderItem.deliveryStatus} to ${input.deliveryStatus}.`,
        409,
        "delivery_status"
      );
    }

    await this.orderRepository.updateItemDeliveryStatus({
      orderItemId,
      deliveryStatus: input.deliveryStatus,
      deliveryFailureReason,
      updatedByUserId: input.sellerId,
      updatedByRole: "seller",
      updatedAt: new Date()
    });

    const order = await this.orderRepository.findDetailByIdAndSellerId(
      orderItem.orderId,
      input.sellerId
    );

    if (!order) {
      throw new UpdateSellerOrderItemDeliveryStatusError(
        "Order not found after update.",
        404,
        "orderItemId"
      );
    }

    return order;
  }
}
