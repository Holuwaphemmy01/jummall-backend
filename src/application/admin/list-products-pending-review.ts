import type {
  ProductRecord,
  ProductRepository
} from "../../ports/product-repository";

export interface ListProductsPendingReviewUseCase {
  execute(): Promise<ProductRecord[]>;
}

export class ListProductsPendingReview
  implements ListProductsPendingReviewUseCase
{
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(): Promise<ProductRecord[]> {
    return this.productRepository.findPendingReview();
  }
}
