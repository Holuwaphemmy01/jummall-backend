import type {
  ProductCategoryRecord,
  ProductCategoryRepository
} from "../../ports/product-category-repository";
import { ProductCategoryError } from "./product-category-errors";

export interface GetProductCategoryInput {
  categoryId: string;
}

export interface GetProductCategoryUseCase {
  execute(input: GetProductCategoryInput): Promise<ProductCategoryRecord>;
}

export class GetProductCategory implements GetProductCategoryUseCase {
  constructor(
    private readonly productCategoryRepository: ProductCategoryRepository
  ) {}

  async execute(
    input: GetProductCategoryInput
  ): Promise<ProductCategoryRecord> {
    const category = await this.productCategoryRepository.findById(
      input.categoryId
    );

    if (!category) {
      throw new ProductCategoryError("Product category not found.", 404);
    }

    return category;
  }
}
