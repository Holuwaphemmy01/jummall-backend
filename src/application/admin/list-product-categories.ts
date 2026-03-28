import type {
  ProductCategoryRecord,
  ProductCategoryRepository
} from "../../ports/product-category-repository";

export interface ListProductCategoriesUseCase {
  execute(): Promise<ProductCategoryRecord[]>;
}

export class ListProductCategories implements ListProductCategoriesUseCase {
  constructor(
    private readonly productCategoryRepository: ProductCategoryRepository
  ) {}

  async execute(): Promise<ProductCategoryRecord[]> {
    return this.productCategoryRepository.findAll();
  }
}
