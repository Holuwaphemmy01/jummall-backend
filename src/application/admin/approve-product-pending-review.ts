import type {
  ProductRecord,
  ProductRepository
} from "../../ports/product-repository";

export interface ApproveProductPendingReviewInput {
  productId: string;
  reviewNote?: string;
}

export interface ApproveProductPendingReviewUseCase {
  execute(input: ApproveProductPendingReviewInput): Promise<ProductRecord>;
}

export class ApproveProductPendingReviewError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "ApproveProductPendingReviewError";
  }
}

export class ApproveProductPendingReview
  implements ApproveProductPendingReviewUseCase
{
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(
    input: ApproveProductPendingReviewInput
  ): Promise<ProductRecord> {
    const existingProduct = await this.productRepository.findById(input.productId);

    if (!existingProduct) {
      throw new ApproveProductPendingReviewError(
        "Product pending review not found.",
        404
      );
    }

    if (existingProduct.status !== "pending_review") {
      throw new ApproveProductPendingReviewError(
        "Product cannot be approved in its current state.",
        409
      );
    }

    const approvedProduct = await this.productRepository.updateStatus({
      productId: input.productId,
      status: "approved",
      reviewNote: input.reviewNote,
      reviewedAt: new Date()
    });

    if (!approvedProduct) {
      throw new ApproveProductPendingReviewError(
        "Product pending review not found.",
        404
      );
    }

    return approvedProduct;
  }
}
