import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { CartRepository, CartStatus } from "../../ports/cart-repository";
import type { CheckoutSessionRepository } from "../../ports/checkout-session-repository";
import { ensureNoOpenCheckoutSession } from "../checkout/ensure-no-open-checkout-session";

export interface ClearBuyerCartInput {
  buyerId: string;
}

export interface ClearBuyerCartResult {
  cartId: string | null;
  cartStatus: CartStatus | null;
  clearedItemsCount: number;
}

export interface ClearBuyerCartUseCase {
  execute(input: ClearBuyerCartInput): Promise<ClearBuyerCartResult>;
}

export class ClearBuyerCartError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ClearBuyerCartError";
  }
}

export class ClearBuyerCart implements ClearBuyerCartUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly cartRepository: CartRepository,
    private readonly checkoutSessionRepository?: CheckoutSessionRepository
  ) {}

  async execute(input: ClearBuyerCartInput): Promise<ClearBuyerCartResult> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new ClearBuyerCartError("Buyer account not found.", 404, "buyer_id");
    }

    if (buyer.role !== "buyer") {
      throw new ClearBuyerCartError(
        "Only buyers can clear cart.",
        403,
        "buyer_id"
      );
    }

    if (this.checkoutSessionRepository) {
      await ensureNoOpenCheckoutSession(
        this.checkoutSessionRepository,
        input.buyerId,
        (message, field) => new ClearBuyerCartError(message, 409, field)
      );
    }

    const cart = await this.cartRepository.findActiveByBuyerId(input.buyerId);

    if (!cart) {
      return {
        cartId: null,
        cartStatus: null,
        clearedItemsCount: 0
      };
    }

    const clearedItemsCount = await this.cartRepository.clearItemsByCartId(cart.id);

    return {
      cartId: cart.id,
      cartStatus: cart.status,
      clearedItemsCount
    };
  }
}
