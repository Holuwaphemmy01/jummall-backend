import type {
  ProductCategoryRecord,
  ProductCategoryRepository
} from "../../ports/product-category-repository";
import { ProductCategoryError } from "./product-category-errors";

export interface CreateProductCategoryInput {
  name: string;
  description: string;
  deductionPercentage: number;
}

export interface CreateProductCategoryUseCase {
  execute(input: CreateProductCategoryInput): Promise<ProductCategoryRecord>;
}

export class CreateProductCategory implements CreateProductCategoryUseCase {
  constructor(
    private readonly productCategoryRepository: ProductCategoryRepository
  ) {}

  async execute(
    input: CreateProductCategoryInput
  ): Promise<ProductCategoryRecord> {
    const existingCategory = await this.productCategoryRepository.findByName(
      input.name
    );

    if (existingCategory) {
      throw new ProductCategoryError(
        "Product category name already exists.",
        409,
        "name"
      );
    }

    return this.productCategoryRepository.create(input);
  }
}
