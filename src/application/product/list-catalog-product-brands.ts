import type {
  ProductBrandRecord,
  ProductBrandRepository
} from "../../ports/product-brand-repository";

export interface ListCatalogProductBrandsUseCase {
  execute(): Promise<ProductBrandRecord[]>;
}

export class ListCatalogProductBrands implements ListCatalogProductBrandsUseCase {
  constructor(private readonly productBrandRepository: ProductBrandRepository) {}

  async execute(): Promise<ProductBrandRecord[]> {
    return this.productBrandRepository.findAll();
  }
}
