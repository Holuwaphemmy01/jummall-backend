import type {
  ApprovedProductCatalogPage,
  ProductCatalogRepository
} from "../../ports/product-catalog-repository";
import type { ProductBrandRepository } from "../../ports/product-brand-repository";

export interface ListApprovedProductsByBrandIdInput {
  brandId: string;
  page?: number;
  limit?: number;
}

export interface ListApprovedProductsByBrandIdUseCase {
  execute(input: ListApprovedProductsByBrandIdInput): Promise<ApprovedProductCatalogPage>;
}

export class ListApprovedProductsByBrandIdError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ListApprovedProductsByBrandIdError";
  }
}

export class ListApprovedProductsByBrandId
  implements ListApprovedProductsByBrandIdUseCase
{
  constructor(
    private readonly productBrandRepository: ProductBrandRepository,
    private readonly productCatalogRepository: ProductCatalogRepository
  ) {}

  async execute(
    input: ListApprovedProductsByBrandIdInput
  ): Promise<ApprovedProductCatalogPage> {
    const trimmedBrandId = input.brandId.trim();

    if (!trimmedBrandId) {
      throw new ListApprovedProductsByBrandIdError(
        "Brand ID is required.",
        400,
        "brand_id"
      );
    }

    const brand = await this.productBrandRepository.findById(trimmedBrandId);

    if (!brand) {
      throw new ListApprovedProductsByBrandIdError(
        "Product brand not found.",
        404,
        "brand_id"
      );
    }

    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    if (page < 1) {
      throw new ListApprovedProductsByBrandIdError(
        "Page must be greater than or equal to 1.",
        400,
        "page"
      );
    }

    if (limit < 1 || limit > 100) {
      throw new ListApprovedProductsByBrandIdError(
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
