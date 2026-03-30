export type CartStatus = "active" | "closed";

export interface CartRecord {
  id: string;
  buyerId: string;
  status: CartStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemRecord {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCartInput {
  buyerId: string;
}

export interface CreateCartItemInput {
  cartId: string;
  productId: string;
  quantity: number;
}

export interface UpdateCartItemQuantityInput {
  cartItemId: string;
  quantity: number;
}

export interface CartRepository {
  findActiveByBuyerId(buyerId: string): Promise<CartRecord | null>;
  createCart(input: CreateCartInput): Promise<CartRecord>;
  findItemByCartIdAndProductId(
    cartId: string,
    productId: string
  ): Promise<CartItemRecord | null>;
  createCartItem(input: CreateCartItemInput): Promise<CartItemRecord>;
  deleteCartItem(cartItemId: string): Promise<CartItemRecord | null>;
  updateCartItemQuantity(
    input: UpdateCartItemQuantityInput
  ): Promise<CartItemRecord | null>;
}
