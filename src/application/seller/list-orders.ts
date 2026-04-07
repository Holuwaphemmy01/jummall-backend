import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  OrderRepository,
  SellerOrderHistoryPage
} from "../../ports/order-repository";

export interface ListSellerOrdersInput {
  sellerId: string;
  page?: number;
  limit?: number;
}

export interface ListSellerOrdersUseCase {
  execute(input: ListSellerOrdersInput): Promise<SellerOrderHistoryPage>;
}

export class ListSellerOrdersError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ListSellerOrdersError";
  }
}

export class ListSellerOrders implements ListSellerOrdersUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly orderRepository: OrderRepository
  ) {}

  async execute(input: ListSellerOrdersInput): Promise<SellerOrderHistoryPage> {
    const seller = await this.authenticationRepository.findById(input.sellerId);

    if (!seller) {
      throw new ListSellerOrdersError(
        "Seller account not found.",
        404,
        "seller_id"
      );
    }

    if (seller.role !== "seller") {
      throw new ListSellerOrdersError(
        "Only sellers can view seller orders.",
        403,
        "seller_id"
      );
    }

    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    if (page < 1) {
      throw new ListSellerOrdersError(
        "Page must be greater than or equal to 1.",
        400,
        "page"
      );
    }

    if (limit < 1 || limit > 100) {
      throw new ListSellerOrdersError(
        "Limit must be between 1 and 100.",
        400,
        "limit"
      );
    }

    return this.orderRepository.findPageBySellerId({
      sellerId: input.sellerId,
      page,
      limit
    });
  }
}
