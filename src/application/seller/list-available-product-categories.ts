import type {
  ProductCategoryRecord,
  ProductCategoryRepository
} from "../../ports/product-category-repository";

export interface ListAvailableProductCategoriesUseCase {
  execute(): Promise<ProductCategoryRecord[]>;
}

export class ListAvailableProductCategories
  implements ListAvailableProductCategoriesUseCase
{
  constructor(
    private readonly productCategoryRepository: ProductCategoryRepository
  ) {}

  async execute(): Promise<ProductCategoryRecord[]> {
    return this.productCategoryRepository.findAll();
  }
}
