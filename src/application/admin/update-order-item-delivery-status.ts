import { canTransitionOrderItemDeliveryStatus } from "../order/order-delivery-status";
import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  OrderDetailRecord,
  OrderItemDeliveryStatus,
  OrderRepository
} from "../../ports/order-repository";

export interface UpdateOrderItemDeliveryStatusInput {
  adminId: string;
  orderItemId: string;
  deliveryStatus: OrderItemDeliveryStatus;
  deliveryFailureReason?: string | null;
}

export interface UpdateOrderItemDeliveryStatusUseCase {
  execute(input: UpdateOrderItemDeliveryStatusInput): Promise<OrderDetailRecord>;
}

export class UpdateOrderItemDeliveryStatusError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "UpdateOrderItemDeliveryStatusError";
  }
}

export class UpdateOrderItemDeliveryStatus
  implements UpdateOrderItemDeliveryStatusUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly orderRepository: OrderRepository
  ) {}

  async execute(
    input: UpdateOrderItemDeliveryStatusInput
  ): Promise<OrderDetailRecord> {
    const admin = await this.authenticationRepository.findById(input.adminId);

    if (!admin) {
      throw new UpdateOrderItemDeliveryStatusError(
        "Admin account not found.",
        404,
        "admin_id"
      );
    }

    if (admin.role !== "admin") {
      throw new UpdateOrderItemDeliveryStatusError(
        "Only admins can update delivery statuses.",
        403,
        "admin_id"
      );
    }

    const orderItemId = input.orderItemId.trim();

    if (!orderItemId) {
      throw new UpdateOrderItemDeliveryStatusError(
        "Order item id is required.",
        400,
        "orderItemId"
      );
    }

    const deliveryFailureReason = input.deliveryFailureReason?.trim() ?? null;

    if (input.deliveryStatus === "delivery_failed" && !deliveryFailureReason) {
      throw new UpdateOrderItemDeliveryStatusError(
        "Delivery failure reason is required when delivery status is delivery_failed.",
        400,
        "delivery_failure_reason"
      );
    }

    if (input.deliveryStatus !== "delivery_failed" && deliveryFailureReason) {
      throw new UpdateOrderItemDeliveryStatusError(
        "Delivery failure reason can only be provided when delivery status is delivery_failed.",
        400,
        "delivery_failure_reason"
      );
    }

    const orderItem = await this.orderRepository.findItemDeliveryContextById(
      orderItemId
    );

    if (!orderItem) {
      throw new UpdateOrderItemDeliveryStatusError(
        "Order item not found.",
        404,
        "orderItemId"
      );
    }

    if (
      !canTransitionOrderItemDeliveryStatus(
        orderItem.deliveryStatus,
        input.deliveryStatus
      )
    ) {
      throw new UpdateOrderItemDeliveryStatusError(
        `Cannot change delivery status from ${orderItem.deliveryStatus} to ${input.deliveryStatus}.`,
        409,
        "delivery_status"
      );
    }

    await this.orderRepository.updateItemDeliveryStatus({
      orderItemId,
      deliveryStatus: input.deliveryStatus,
      deliveryFailureReason,
      updatedByUserId: input.adminId,
      updatedByRole: "admin",
      updatedAt: new Date()
    });

    const order = await this.orderRepository.findById(orderItem.orderId);

    if (!order) {
      throw new UpdateOrderItemDeliveryStatusError(
        "Order not found after update.",
        404,
        "orderItemId"
      );
    }

    return order;
  }
}
