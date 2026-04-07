import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { OrderDetailRecord, OrderRepository } from "../../ports/order-repository";

export interface GetOrderDetailInput {
  adminId: string;
  orderId: string;
}

export interface GetOrderDetailUseCase {
  execute(input: GetOrderDetailInput): Promise<OrderDetailRecord>;
}

export class GetOrderDetailError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "GetOrderDetailError";
  }
}

export class GetOrderDetail implements GetOrderDetailUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly orderRepository: OrderRepository
  ) {}

  async execute(input: GetOrderDetailInput): Promise<OrderDetailRecord> {
    const admin = await this.authenticationRepository.findById(input.adminId);

    if (!admin) {
      throw new GetOrderDetailError("Admin account not found.", 404, "admin_id");
    }

    if (admin.role !== "admin") {
      throw new GetOrderDetailError(
        "Only admins can view order details.",
        403,
        "admin_id"
      );
    }

    const orderId = input.orderId.trim();

    if (!orderId) {
      throw new GetOrderDetailError("Order id is required.", 400, "orderId");
    }

    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new GetOrderDetailError("Order not found.", 404, "orderId");
    }

    return order;
  }
}
