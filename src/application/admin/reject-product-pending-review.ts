import type {
  ProductRecord,
  ProductRepository
} from "../../ports/product-repository";

export interface RejectProductPendingReviewInput {
  productId: string;
  reviewNote: string;
}

export interface RejectProductPendingReviewUseCase {
  execute(input: RejectProductPendingReviewInput): Promise<ProductRecord>;
}

export class RejectProductPendingReviewError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "RejectProductPendingReviewError";
  }
}

export class RejectProductPendingReview
  implements RejectProductPendingReviewUseCase
{
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(
    input: RejectProductPendingReviewInput
  ): Promise<ProductRecord> {
    const existingProduct = await this.productRepository.findById(input.productId);

    if (!existingProduct) {
      throw new RejectProductPendingReviewError(
        "Product pending review not found.",
        404
      );
    }

    if (existingProduct.status !== "pending_review") {
      throw new RejectProductPendingReviewError(
        "Product cannot be rejected in its current state.",
        409
      );
    }

    const reviewNote = input.reviewNote.trim();

    if (!reviewNote) {
      throw new RejectProductPendingReviewError(
        "Review note is required to reject a product.",
        400
      );
    }

    const rejectedProduct = await this.productRepository.updateStatus({
      productId: input.productId,
      status: "rejected",
      reviewNote,
      reviewedAt: new Date()
    });

    if (!rejectedProduct) {
      throw new RejectProductPendingReviewError(
        "Product pending review not found.",
        404
      );
    }

    return rejectedProduct;
  }
}
