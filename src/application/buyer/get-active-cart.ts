import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  CartItemRecord,
  CartRecord,
  CartRepository
} from "../../ports/cart-repository";
import type { ProductRecord, ProductRepository } from "../../ports/product-repository";

export interface GetActiveCartInput {
  buyerId: string;
}

export interface GetActiveCartItemResult {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  currency: string;
  product: {
    id: string;
    name: string;
    description: string;
    brandId: string | null;
    brandName: string | null;
    categoryId: string;
    sku: string | null;
    condition: string;
    weightKg: number;
    status: ProductRecord["status"];
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

export interface GetActiveCartResult {
  cart: CartRecord | null;
  items: GetActiveCartItemResult[];
  totalItems: number;
  totalProducts: number;
  subtotal: number;
  currency: string | null;
}

export interface GetActiveCartUseCase {
  execute(input: GetActiveCartInput): Promise<GetActiveCartResult>;
}

export class GetActiveCartError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "GetActiveCartError";
  }
}

export class GetActiveCart implements GetActiveCartUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository
  ) {}

  async execute(input: GetActiveCartInput): Promise<GetActiveCartResult> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new GetActiveCartError("Buyer account not found.", 404, "buyer_id");
    }

    if (buyer.role !== "buyer") {
      throw new GetActiveCartError(
        "Only buyers can fetch cart.",
        403,
        "buyer_id"
      );
    }

    const cart = await this.cartRepository.findActiveByBuyerId(input.buyerId);

    if (!cart) {
      return {
        cart: null,
        items: [],
        totalItems: 0,
        totalProducts: 0,
        subtotal: 0,
        currency: null
      };
    }

    const cartItems = await this.cartRepository.findItemsByCartId(cart.id);
    const itemResults: GetActiveCartItemResult[] = [];

    for (const cartItem of cartItems) {
      const product = await this.productRepository.findById(cartItem.productId);

      if (!product) {
        throw new GetActiveCartError(
          "Cart contains a product that no longer exists.",
          404,
          "product_id"
        );
      }

      itemResults.push(this.toCartItemResult(cartItem, product));
    }

    const subtotal = itemResults.reduce((sum, item) => sum + item.subtotal, 0);
    const totalItems = itemResults.reduce((sum, item) => sum + item.quantity, 0);
    const totalProducts = itemResults.length;

    return {
      cart,
      items: itemResults,
      totalItems,
      totalProducts,
      subtotal,
      currency: itemResults[0]?.currency ?? null
    };
  }

  private toCartItemResult(
    cartItem: CartItemRecord,
    product: ProductRecord
  ): GetActiveCartItemResult {
    return {
      id: cartItem.id,
      productId: cartItem.productId,
      quantity: cartItem.quantity,
      unitPrice: product.price,
      subtotal: product.price * cartItem.quantity,
      currency: product.currency,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        brandId: product.brandId,
        brandName: product.brandName,
        categoryId: product.categoryId,
        sku: product.sku,
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
      createdAt: cartItem.createdAt,
      updatedAt: cartItem.updatedAt
    };
  }
}
