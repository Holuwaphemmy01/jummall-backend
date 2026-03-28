import type {
  ProductCategoryRecord,
  ProductCategoryRepository
} from "../../ports/product-category-repository";
import { ProductCategoryError } from "./product-category-errors";

export interface UpdateProductCategoryInput {
  categoryId: string;
  name?: string;
  description?: string;
  deductionPercentage?: number;
}

export interface UpdateProductCategoryUseCase {
  execute(input: UpdateProductCategoryInput): Promise<ProductCategoryRecord>;
}

export class UpdateProductCategory implements UpdateProductCategoryUseCase {
  constructor(
    private readonly productCategoryRepository: ProductCategoryRepository
  ) {}

  async execute(
    input: UpdateProductCategoryInput
  ): Promise<ProductCategoryRecord> {
    const existingCategory = await this.productCategoryRepository.findById(
      input.categoryId
    );

    if (!existingCategory) {
      throw new ProductCategoryError("Product category not found.", 404);
    }

    if (input.name && input.name !== existingCategory.name) {
      const categoryWithSameName =
        await this.productCategoryRepository.findByName(input.name);

      if (categoryWithSameName) {
        throw new ProductCategoryError(
          "Product category name already exists.",
          409,
          "name"
        );
      }
    }

    const updatedCategory = await this.productCategoryRepository.update(input);

    if (!updatedCategory) {
      throw new ProductCategoryError("Product category not found.", 404);
    }

    return updatedCategory;
  }
}
