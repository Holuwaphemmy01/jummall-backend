import type {
  ProductBrandRecord,
  ProductBrandRepository
} from "../../ports/product-brand-repository";

export interface ListAvailableProductBrandsUseCase {
  execute(): Promise<ProductBrandRecord[]>;
}

export class ListAvailableProductBrands
  implements ListAvailableProductBrandsUseCase
{
  constructor(private readonly productBrandRepository: ProductBrandRepository) {}

  async execute(): Promise<ProductBrandRecord[]> {
    return this.productBrandRepository.findAll();
  }
}
