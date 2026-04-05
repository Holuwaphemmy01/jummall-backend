import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { CartItemRecord, CartRepository } from "../../ports/cart-repository";
import type { CheckoutSessionRepository } from "../../ports/checkout-session-repository";
import { ensureNoOpenCheckoutSession } from "../checkout/ensure-no-open-checkout-session";

export interface RemoveProductFromCartInput {
  buyerId: string;
  productId: string;
}

export interface RemoveProductFromCartUseCase {
  execute(input: RemoveProductFromCartInput): Promise<CartItemRecord>;
}

export class RemoveProductFromCartError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "RemoveProductFromCartError";
  }
}

export class RemoveProductFromCart implements RemoveProductFromCartUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly cartRepository: CartRepository,
    private readonly checkoutSessionRepository?: CheckoutSessionRepository
  ) {}

  async execute(input: RemoveProductFromCartInput): Promise<CartItemRecord> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new RemoveProductFromCartError(
        "Buyer account not found.",
        404,
        "buyer_id"
      );
    }

    if (buyer.role !== "buyer") {
      throw new RemoveProductFromCartError(
        "Only buyers can remove products from cart.",
        403,
        "buyer_id"
      );
    }

    if (this.checkoutSessionRepository) {
      await ensureNoOpenCheckoutSession(
        this.checkoutSessionRepository,
        input.buyerId,
        (message, field) => new RemoveProductFromCartError(message, 409, field)
      );
    }

    const cart = await this.cartRepository.findActiveByBuyerId(input.buyerId);

    if (!cart) {
      throw new RemoveProductFromCartError(
        "Active cart not found.",
        404,
        "buyer_id"
      );
    }

    const cartItem = await this.cartRepository.findItemByCartIdAndProductId(
      cart.id,
      input.productId
    );

    if (!cartItem) {
      throw new RemoveProductFromCartError(
        "Product is not in the active cart.",
        404,
        "product_id"
      );
    }

    const deletedCartItem = await this.cartRepository.deleteCartItem(cartItem.id);

    if (!deletedCartItem) {
      throw new RemoveProductFromCartError(
        "Unable to remove product from cart.",
        500,
        "product_id"
      );
    }

    return deletedCartItem;
  }
}
