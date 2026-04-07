import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  OrderRepository,
  SellerOrderDetailRecord
} from "../../ports/order-repository";

export interface GetSellerOrderDetailInput {
  sellerId: string;
  orderId: string;
}

export interface GetSellerOrderDetailUseCase {
  execute(input: GetSellerOrderDetailInput): Promise<SellerOrderDetailRecord>;
}

export class GetSellerOrderDetailError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "GetSellerOrderDetailError";
  }
}

export class GetSellerOrderDetail implements GetSellerOrderDetailUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly orderRepository: OrderRepository
  ) {}

  async execute(input: GetSellerOrderDetailInput): Promise<SellerOrderDetailRecord> {
    const seller = await this.authenticationRepository.findById(input.sellerId);

    if (!seller) {
      throw new GetSellerOrderDetailError(
        "Seller account not found.",
        404,
        "seller_id"
      );
    }

    if (seller.role !== "seller") {
      throw new GetSellerOrderDetailError(
        "Only sellers can view seller order details.",
        403,
        "seller_id"
      );
    }

    const orderId = input.orderId.trim();

    if (!orderId) {
      throw new GetSellerOrderDetailError("Order id is required.", 400, "orderId");
    }

    const order = await this.orderRepository.findDetailByIdAndSellerId(
      orderId,
      input.sellerId
    );

    if (!order) {
      throw new GetSellerOrderDetailError("Order not found.", 404, "orderId");
    }

    return order;
  }
}
