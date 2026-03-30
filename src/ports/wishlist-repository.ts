export interface WishlistItemRecord {
  id: string;
  buyerId: string;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWishlistItemInput {
  buyerId: string;
  productId: string;
}

export interface WishlistRepository {
  create(input: CreateWishlistItemInput): Promise<WishlistItemRecord>;
  findByBuyerId(buyerId: string): Promise<WishlistItemRecord[]>;
  findByBuyerIdAndProductId(
    buyerId: string,
    productId: string
  ): Promise<WishlistItemRecord | null>;
  deleteByBuyerIdAndProductId(
    buyerId: string,
    productId: string
  ): Promise<WishlistItemRecord | null>;
}
