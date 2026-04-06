import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { OrderHistoryPage, OrderRepository } from "../../ports/order-repository";

export interface ListBuyerOrdersInput {
  buyerId: string;
  page?: number;
  limit?: number;
}

export interface ListBuyerOrdersUseCase {
  execute(input: ListBuyerOrdersInput): Promise<OrderHistoryPage>;
}

export class ListBuyerOrdersError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ListBuyerOrdersError";
  }
}

export class ListBuyerOrders implements ListBuyerOrdersUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly orderRepository: OrderRepository
  ) {}

  async execute(input: ListBuyerOrdersInput): Promise<OrderHistoryPage> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new ListBuyerOrdersError("Buyer account not found.", 404, "buyer_id");
    }

    if (buyer.role !== "buyer") {
      throw new ListBuyerOrdersError(
        "Only buyers can view order history.",
        403,
        "buyer_id"
      );
    }

    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    if (page < 1) {
      throw new ListBuyerOrdersError(
        "Page must be greater than or equal to 1.",
        400,
        "page"
      );
    }

    if (limit < 1 || limit > 100) {
      throw new ListBuyerOrdersError(
        "Limit must be between 1 and 100.",
        400,
        "limit"
      );
    }

    return this.orderRepository.findPageByBuyerId({
      buyerId: input.buyerId,
      page,
      limit
    });
  }
}
