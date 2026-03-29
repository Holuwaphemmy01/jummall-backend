import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { WishlistRepository } from "../../ports/wishlist-repository";

export interface RemoveProductFromWishlistInput {
  buyerId: string;
  productId: string;
}

export interface RemoveProductFromWishlistUseCase {
  execute(input: RemoveProductFromWishlistInput): Promise<void>;
}

export class RemoveProductFromWishlistError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "RemoveProductFromWishlistError";
  }
}

export class RemoveProductFromWishlist
  implements RemoveProductFromWishlistUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly wishlistRepository: WishlistRepository
  ) {}

  async execute(input: RemoveProductFromWishlistInput): Promise<void> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new RemoveProductFromWishlistError(
        "Buyer account not found.",
        404,
        "buyer_id"
      );
    }

    if (buyer.role !== "buyer") {
      throw new RemoveProductFromWishlistError(
        "Only buyers can remove products from wishlist.",
        403,
        "buyer_id"
      );
    }

    const wishlistItem = await this.wishlistRepository.findByBuyerIdAndProductId(
      input.buyerId,
      input.productId
    );

    if (!wishlistItem) {
      throw new RemoveProductFromWishlistError(
        "Wishlist item not found.",
        404,
        "product_id"
      );
    }

    await this.wishlistRepository.deleteByBuyerIdAndProductId(
      input.buyerId,
      input.productId
    );
  }
}
