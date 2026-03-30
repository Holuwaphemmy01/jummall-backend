import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  CartItemRecord,
  CartRecord,
  CartRepository
} from "../../ports/cart-repository";
import type { ProductRepository } from "../../ports/product-repository";

export interface AddProductToCartInput {
  buyerId: string;
  productId: string;
  quantity: number;
}

export interface AddProductToCartResult {
  cart: CartRecord;
  item: CartItemRecord;
  unitPrice: number;
  subtotal: number;
  currency: string;
}

export interface AddProductToCartUseCase {
  execute(input: AddProductToCartInput): Promise<AddProductToCartResult>;
}

export class AddProductToCartError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "AddProductToCartError";
  }
}

export class AddProductToCart implements AddProductToCartUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly productRepository: ProductRepository,
    private readonly cartRepository: CartRepository
  ) {}

  async execute(input: AddProductToCartInput): Promise<AddProductToCartResult> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new AddProductToCartError("Buyer account not found.", 404, "buyer_id");
    }

    if (buyer.role !== "buyer") {
      throw new AddProductToCartError(
        "Only buyers can add products to cart.",
        403,
        "buyer_id"
      );
    }

    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new AddProductToCartError(
        "Quantity must be greater than zero.",
        400,
        "quantity"
      );
    }

    const product = await this.productRepository.findById(input.productId);

    if (!product) {
      throw new AddProductToCartError("Product not found.", 404, "product_id");
    }

    if (product.status !== "approved") {
      throw new AddProductToCartError(
        "Only approved products can be added to cart.",
        409,
        "product_id"
      );
    }

    if (product.quantity <= 0) {
      throw new AddProductToCartError(
        "Product is out of stock.",
        409,
        "product_id"
      );
    }

    if (input.quantity > product.quantity) {
      throw new AddProductToCartError(
        "Requested quantity exceeds available stock.",
        409,
        "quantity"
      );
    }

    const cart =
      (await this.cartRepository.findActiveByBuyerId(input.buyerId)) ??
      (await this.cartRepository.createCart({
        buyerId: input.buyerId
      }));

    const existingCartItem = await this.cartRepository.findItemByCartIdAndProductId(
      cart.id,
      input.productId
    );

    let cartItem: CartItemRecord;

    if (existingCartItem) {
      const updatedQuantity = existingCartItem.quantity + input.quantity;

      if (updatedQuantity > product.quantity) {
        throw new AddProductToCartError(
          "Requested quantity exceeds available stock.",
          409,
          "quantity"
        );
      }

      const updatedCartItem = await this.cartRepository.updateCartItemQuantity({
        cartItemId: existingCartItem.id,
        quantity: updatedQuantity
      });

      if (!updatedCartItem) {
        throw new AddProductToCartError(
          "Unable to update cart item.",
          500,
          "product_id"
        );
      }

      cartItem = updatedCartItem;
    } else {
      cartItem = await this.cartRepository.createCartItem({
        cartId: cart.id,
        productId: input.productId,
        quantity: input.quantity
      });
    }

    return {
      cart,
      item: cartItem,
      unitPrice: product.price,
      subtotal: product.price * cartItem.quantity,
      currency: product.currency
    };
  }
}
