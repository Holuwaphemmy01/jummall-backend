import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  ProductRecord,
  ProductRepository
} from "../../ports/product-repository";

export interface ListSellerProductsInput {
  sellerId: string;
}

export interface ListSellerProductsUseCase {
  execute(input: ListSellerProductsInput): Promise<ProductRecord[]>;
}

export class ListSellerProductsError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ListSellerProductsError";
  }
}

export class ListSellerProducts implements ListSellerProductsUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly productRepository: ProductRepository
  ) {}

  async execute(input: ListSellerProductsInput): Promise<ProductRecord[]> {
    const seller = await this.authenticationRepository.findById(input.sellerId);

    if (!seller) {
      throw new ListSellerProductsError(
        "Seller account not found.",
        404,
        "seller_id"
      );
    }

    if (seller.role !== "seller") {
      throw new ListSellerProductsError(
        "Only sellers can access seller products.",
        403,
        "seller_id"
      );
    }

    return this.productRepository.findBySellerId(input.sellerId);
  }
}
