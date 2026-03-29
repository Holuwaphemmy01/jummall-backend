import type {
  ProductBrandRecord,
  ProductBrandRepository
} from "../../ports/product-brand-repository";
import { ProductBrandError } from "./product-brand-errors";

export interface UpdateProductBrandInput {
  brandId: string;
  name?: string;
  description?: string;
}

export interface UpdateProductBrandUseCase {
  execute(input: UpdateProductBrandInput): Promise<ProductBrandRecord>;
}

export class UpdateProductBrand implements UpdateProductBrandUseCase {
  constructor(private readonly productBrandRepository: ProductBrandRepository) {}

  async execute(input: UpdateProductBrandInput): Promise<ProductBrandRecord> {
    if (input.name) {
      const existingBrand = await this.productBrandRepository.findByName(input.name);

      if (existingBrand && existingBrand.id !== input.brandId) {
        throw new ProductBrandError(
          "Product brand name already exists.",
          409,
          "name"
        );
      }
    }

    const updatedBrand = await this.productBrandRepository.update(input);

    if (!updatedBrand) {
      throw new ProductBrandError("Product brand not found.", 404);
    }

    return updatedBrand;
  }
}
