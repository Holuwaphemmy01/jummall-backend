import type {
  ProductBrandRecord,
  ProductBrandRepository
} from "../../ports/product-brand-repository";
import { ProductBrandError } from "./product-brand-errors";

export interface GetProductBrandInput {
  brandId: string;
}

export interface GetProductBrandUseCase {
  execute(input: GetProductBrandInput): Promise<ProductBrandRecord>;
}

export class GetProductBrand implements GetProductBrandUseCase {
  constructor(private readonly productBrandRepository: ProductBrandRepository) {}

  async execute(input: GetProductBrandInput): Promise<ProductBrandRecord> {
    const brand = await this.productBrandRepository.findById(input.brandId);

    if (!brand) {
      throw new ProductBrandError("Product brand not found.", 404);
    }

    return brand;
  }
}
