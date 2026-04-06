import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { OrderDetailRecord, OrderRepository } from "../../ports/order-repository";

export interface GetBuyerOrderDetailInput {
  buyerId: string;
  orderId: string;
}

export interface GetBuyerOrderDetailUseCase {
  execute(input: GetBuyerOrderDetailInput): Promise<OrderDetailRecord>;
}

export class GetBuyerOrderDetailError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "GetBuyerOrderDetailError";
  }
}

export class GetBuyerOrderDetail implements GetBuyerOrderDetailUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly orderRepository: OrderRepository
  ) {}

  async execute(input: GetBuyerOrderDetailInput): Promise<OrderDetailRecord> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new GetBuyerOrderDetailError(
        "Buyer account not found.",
        404,
        "buyer_id"
      );
    }

    if (buyer.role !== "buyer") {
      throw new GetBuyerOrderDetailError(
        "Only buyers can view order details.",
        403,
        "buyer_id"
      );
    }

    const orderId = input.orderId.trim();

    if (!orderId) {
      throw new GetBuyerOrderDetailError("Order id is required.", 400, "orderId");
    }

    const order = await this.orderRepository.findDetailByIdAndBuyerId(
      orderId,
      input.buyerId
    );

    if (!order) {
      throw new GetBuyerOrderDetailError("Order not found.", 404, "orderId");
    }

    return order;
  }
}
