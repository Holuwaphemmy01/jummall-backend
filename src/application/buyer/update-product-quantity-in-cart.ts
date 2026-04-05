import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  CartItemRecord,
  CartRecord,
  CartRepository
} from "../../ports/cart-repository";
import type { CheckoutSessionRepository } from "../../ports/checkout-session-repository";
import type { ProductRepository } from "../../ports/product-repository";
import { ensureNoOpenCheckoutSession } from "../checkout/ensure-no-open-checkout-session";

export interface UpdateProductQuantityInCartInput {
  buyerId: string;
  productId: string;
  quantity: number;
}

export interface UpdateProductQuantityInCartResult {
  cart: CartRecord;
  item: CartItemRecord;
  unitPrice: number;
  subtotal: number;
  currency: string;
}

export interface UpdateProductQuantityInCartUseCase {
  execute(
    input: UpdateProductQuantityInCartInput
  ): Promise<UpdateProductQuantityInCartResult>;
}

export class UpdateProductQuantityInCartError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "UpdateProductQuantityInCartError";
  }
}

export class UpdateProductQuantityInCart
  implements UpdateProductQuantityInCartUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly productRepository: ProductRepository,
    private readonly cartRepository: CartRepository,
    private readonly checkoutSessionRepository?: CheckoutSessionRepository
  ) {}

  async execute(
    input: UpdateProductQuantityInCartInput
  ): Promise<UpdateProductQuantityInCartResult> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new UpdateProductQuantityInCartError(
        "Buyer account not found.",
        404,
        "buyer_id"
      );
    }

    if (buyer.role !== "buyer") {
      throw new UpdateProductQuantityInCartError(
        "Only buyers can update cart quantities.",
        403,
        "buyer_id"
      );
    }

    if (this.checkoutSessionRepository) {
      await ensureNoOpenCheckoutSession(
        this.checkoutSessionRepository,
        input.buyerId,
        (message, field) =>
          new UpdateProductQuantityInCartError(message, 409, field)
      );
    }

    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new UpdateProductQuantityInCartError(
        "Quantity must be greater than zero.",
        400,
        "quantity"
      );
    }

    const cart = await this.cartRepository.findActiveByBuyerId(input.buyerId);

    if (!cart) {
      throw new UpdateProductQuantityInCartError(
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
      throw new UpdateProductQuantityInCartError(
        "Product is not in the active cart.",
        404,
        "product_id"
      );
    }

    const product = await this.productRepository.findById(input.productId);

    if (!product) {
      throw new UpdateProductQuantityInCartError(
        "Product not found.",
        404,
        "product_id"
      );
    }

    if (product.status !== "approved") {
      throw new UpdateProductQuantityInCartError(
        "Only approved products can remain in cart.",
        409,
        "product_id"
      );
    }

    if (product.quantity <= 0) {
      throw new UpdateProductQuantityInCartError(
        "Product is out of stock.",
        409,
        "product_id"
      );
    }

    if (input.quantity > product.quantity) {
      throw new UpdateProductQuantityInCartError(
        "Requested quantity exceeds available stock.",
        409,
        "quantity"
      );
    }

    const updatedCartItem = await this.cartRepository.updateCartItemQuantity({
      cartItemId: cartItem.id,
      quantity: input.quantity
    });

    if (!updatedCartItem) {
      throw new UpdateProductQuantityInCartError(
        "Unable to update cart item quantity.",
        500,
        "quantity"
      );
    }

    return {
      cart,
      item: updatedCartItem,
      unitPrice: product.price,
      subtotal: product.price * updatedCartItem.quantity,
      currency: product.currency
    };
  }
}
