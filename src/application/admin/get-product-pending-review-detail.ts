import type {
  ProductRecord,
  ProductRepository
} from "../../ports/product-repository";

export interface GetProductPendingReviewDetailInput {
  productId: string;
}

export interface GetProductPendingReviewDetailUseCase {
  execute(input: GetProductPendingReviewDetailInput): Promise<ProductRecord>;
}

export class GetProductPendingReviewDetailError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "GetProductPendingReviewDetailError";
  }
}

export class GetProductPendingReviewDetail
  implements GetProductPendingReviewDetailUseCase
{
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(
    input: GetProductPendingReviewDetailInput
  ): Promise<ProductRecord> {
    const product = await this.productRepository.findById(input.productId);

    if (!product || product.status !== "pending_review") {
      throw new GetProductPendingReviewDetailError(
        "Product pending review not found.",
        404
      );
    }

    return product;
  }
}
