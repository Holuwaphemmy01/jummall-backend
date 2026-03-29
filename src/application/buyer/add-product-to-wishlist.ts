import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { ProductRepository } from "../../ports/product-repository";
import type {
  WishlistItemRecord,
  WishlistRepository
} from "../../ports/wishlist-repository";

export interface AddProductToWishlistInput {
  buyerId: string;
  productId: string;
}

export interface AddProductToWishlistUseCase {
  execute(input: AddProductToWishlistInput): Promise<WishlistItemRecord>;
}

export class AddProductToWishlistError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "AddProductToWishlistError";
  }
}

export class AddProductToWishlist implements AddProductToWishlistUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly productRepository: ProductRepository,
    private readonly wishlistRepository: WishlistRepository
  ) {}

  async execute(
    input: AddProductToWishlistInput
  ): Promise<WishlistItemRecord> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new AddProductToWishlistError("Buyer account not found.", 404, "buyer_id");
    }

    if (buyer.role !== "buyer") {
      throw new AddProductToWishlistError(
        "Only buyers can add products to wishlist.",
        403,
        "buyer_id"
      );
    }

    const product = await this.productRepository.findById(input.productId);

    if (!product) {
      throw new AddProductToWishlistError("Product not found.", 404, "product_id");
    }

    if (product.status !== "approved") {
      throw new AddProductToWishlistError(
        "Only approved products can be added to wishlist.",
        409,
        "product_id"
      );
    }

    const existingWishlistItem =
      await this.wishlistRepository.findByBuyerIdAndProductId(
        input.buyerId,
        input.productId
      );

    if (existingWishlistItem) {
      throw new AddProductToWishlistError(
        "Product is already in wishlist.",
        409,
        "product_id"
      );
    }

    return this.wishlistRepository.create({
      buyerId: input.buyerId,
      productId: input.productId
    });
  }
}
