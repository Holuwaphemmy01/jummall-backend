import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { OrderHistoryPage, OrderRepository } from "../../ports/order-repository";

export interface ListOrdersInput {
  adminId: string;
  page?: number;
  limit?: number;
}

export interface ListOrdersUseCase {
  execute(input: ListOrdersInput): Promise<OrderHistoryPage>;
}

export class ListOrdersError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ListOrdersError";
  }
}

export class ListOrders implements ListOrdersUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly orderRepository: OrderRepository
  ) {}

  async execute(input: ListOrdersInput): Promise<OrderHistoryPage> {
    const admin = await this.authenticationRepository.findById(input.adminId);

    if (!admin) {
      throw new ListOrdersError("Admin account not found.", 404, "admin_id");
    }

    if (admin.role !== "admin") {
      throw new ListOrdersError(
        "Only admins can view orders.",
        403,
        "admin_id"
      );
    }

    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    if (page < 1) {
      throw new ListOrdersError(
        "Page must be greater than or equal to 1.",
        400,
        "page"
      );
    }

    if (limit < 1 || limit > 100) {
      throw new ListOrdersError(
        "Limit must be between 1 and 100.",
        400,
        "limit"
      );
    }

    return this.orderRepository.findPage({
      page,
      limit
    });
  }
}
