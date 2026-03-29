import type {
  ProductBrandRecord,
  ProductBrandRepository
} from "../../ports/product-brand-repository";

export interface ListProductBrandsUseCase {
  execute(): Promise<ProductBrandRecord[]>;
}

export class ListProductBrands implements ListProductBrandsUseCase {
  constructor(private readonly productBrandRepository: ProductBrandRepository) {}

  async execute(): Promise<ProductBrandRecord[]> {
    return this.productBrandRepository.findAll();
  }
}
