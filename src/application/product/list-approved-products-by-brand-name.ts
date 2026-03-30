import type {
  ApprovedProductCatalogPage,
  ProductCatalogRepository
} from "../../ports/product-catalog-repository";
import type { ProductBrandRepository } from "../../ports/product-brand-repository";

export interface ListApprovedProductsByBrandNameInput {
  brandName: string;
  page?: number;
  limit?: number;
}

export interface ListApprovedProductsByBrandNameUseCase {
  execute(
    input: ListApprovedProductsByBrandNameInput
  ): Promise<ApprovedProductCatalogPage>;
}

export class ListApprovedProductsByBrandNameError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ListApprovedProductsByBrandNameError";
  }
}

export class ListApprovedProductsByBrandName
  implements ListApprovedProductsByBrandNameUseCase
{
  constructor(
    private readonly productBrandRepository: ProductBrandRepository,
    private readonly productCatalogRepository: ProductCatalogRepository
  ) {}

  async execute(
    input: ListApprovedProductsByBrandNameInput
  ): Promise<ApprovedProductCatalogPage> {
    const trimmedBrandName = input.brandName.trim();

    if (!trimmedBrandName) {
      throw new ListApprovedProductsByBrandNameError(
        "Brand name is required.",
        400,
        "brand_name"
      );
    }

    const brand = await this.productBrandRepository.findByName(trimmedBrandName);

    if (!brand) {
      throw new ListApprovedProductsByBrandNameError(
        "Product brand not found.",
        404,
        "brand_name"
      );
    }

    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    if (page < 1) {
      throw new ListApprovedProductsByBrandNameError(
        "Page must be greater than or equal to 1.",
        400,
        "page"
      );
    }

    if (limit < 1 || limit > 100) {
      throw new ListApprovedProductsByBrandNameError(
        "Limit must be between 1 and 100.",
        400,
        "limit"
      );
    }

    return this.productCatalogRepository.listApproved({
      page,
      limit,
      brandId: brand.id
    });
  }
}
