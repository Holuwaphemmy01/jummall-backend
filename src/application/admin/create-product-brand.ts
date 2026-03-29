import type {
  ProductBrandRecord,
  ProductBrandRepository
} from "../../ports/product-brand-repository";
import { ProductBrandError } from "./product-brand-errors";

export interface CreateProductBrandInput {
  name: string;
  description: string;
}

export interface CreateProductBrandUseCase {
  execute(input: CreateProductBrandInput): Promise<ProductBrandRecord>;
}

export class CreateProductBrand implements CreateProductBrandUseCase {
  constructor(private readonly productBrandRepository: ProductBrandRepository) {}

  async execute(input: CreateProductBrandInput): Promise<ProductBrandRecord> {
    const existingBrand = await this.productBrandRepository.findByName(input.name);

    if (existingBrand) {
      throw new ProductBrandError("Product brand name already exists.", 409, "name");
    }

    return this.productBrandRepository.create(input);
  }
}
