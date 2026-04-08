import type {
  ProductCategoryRecord,
  ProductCategoryRepository
} from "../../ports/product-category-repository";

export interface ListCatalogProductCategoriesUseCase {
  execute(): Promise<ProductCategoryRecord[]>;
}

export class ListCatalogProductCategories
  implements ListCatalogProductCategoriesUseCase
{
  constructor(
    private readonly productCategoryRepository: ProductCategoryRepository
  ) {}

  async execute(): Promise<ProductCategoryRecord[]> {
    return this.productCategoryRepository.findAll();
  }
}
