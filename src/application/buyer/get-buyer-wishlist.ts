import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { ProductRepository } from "../../ports/product-repository";
import type { WishlistRepository } from "../../ports/wishlist-repository";

export interface GetBuyerWishlistInput {
  buyerId: string;
}

export interface GetBuyerWishlistItemResult {
  id: string;
  buyerId: string;
  productId: string;
  product: {
    id: string;
    name: string;
    description: string;
    brandId: string | null;
    brandName: string | null;
    categoryId: string;
    sku: string | null;
    price: number;
    currency: string;
    condition: string;
    weightKg: number;
    status: "pending_review" | "approved" | "rejected";
    availableQuantity: number;
    images: Array<{
      id: string;
      storagePath: string;
      mimeType: string;
      originalFileName: string;
      position: number;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface GetBuyerWishlistResult {
  items: GetBuyerWishlistItemResult[];
}

export interface GetBuyerWishlistUseCase {
  execute(input: GetBuyerWishlistInput): Promise<GetBuyerWishlistResult>;
}

export class GetBuyerWishlistError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "GetBuyerWishlistError";
  }
}

export class GetBuyerWishlist implements GetBuyerWishlistUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly wishlistRepository: WishlistRepository,
    private readonly productRepository: ProductRepository
  ) {}

  async execute(input: GetBuyerWishlistInput): Promise<GetBuyerWishlistResult> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new GetBuyerWishlistError("Buyer account not found.", 404, "buyer_id");
    }

    if (buyer.role !== "buyer") {
      throw new GetBuyerWishlistError(
        "Only buyers can fetch wishlist.",
        403,
        "buyer_id"
      );
    }

    const wishlistItems = await this.wishlistRepository.findByBuyerId(input.buyerId);
    const items: GetBuyerWishlistItemResult[] = [];

    for (const wishlistItem of wishlistItems) {
      const product = await this.productRepository.findById(wishlistItem.productId);

      if (!product) {
        continue;
      }

      items.push({
        id: wishlistItem.id,
        buyerId: wishlistItem.buyerId,
        productId: wishlistItem.productId,
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          brandId: product.brandId,
          brandName: product.brandName,
          categoryId: product.categoryId,
          sku: product.sku,
          price: product.price,
          currency: product.currency,
          condition: product.condition,
          weightKg: product.weightKg,
          status: product.status,
          availableQuantity: product.quantity,
          images: product.images.map((image) => ({
            id: image.id,
            storagePath: image.storagePath,
            mimeType: image.mimeType,
            originalFileName: image.originalFileName,
            position: image.position
          }))
        },
        createdAt: wishlistItem.createdAt,
        updatedAt: wishlistItem.updatedAt
      });
    }

    return { items };
  }
}
