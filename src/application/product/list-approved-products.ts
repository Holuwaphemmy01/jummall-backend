import type {
  ApprovedProductCatalogPage,
  ProductCatalogRepository
} from "../../ports/product-catalog-repository";

export interface ListApprovedProductsInput {
  page?: number;
  limit?: number;
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export interface ListApprovedProductsUseCase {
  execute(input: ListApprovedProductsInput): Promise<ApprovedProductCatalogPage>;
}

export class ListApprovedProductsError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ListApprovedProductsError";
  }
}

export class ListApprovedProducts implements ListApprovedProductsUseCase {
  constructor(private readonly productCatalogRepository: ProductCatalogRepository) {}

  async execute(
    input: ListApprovedProductsInput
  ): Promise<ApprovedProductCatalogPage> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    if (page < 1) {
      throw new ListApprovedProductsError(
        "Page must be greater than or equal to 1.",
        400,
        "page"
      );
    }

    if (limit < 1 || limit > 100) {
      throw new ListApprovedProductsError(
        "Limit must be between 1 and 100.",
        400,
        "limit"
      );
    }

    if (
      typeof input.minPrice === "number" &&
      typeof input.maxPrice === "number" &&
      input.minPrice > input.maxPrice
    ) {
      throw new ListApprovedProductsError(
        "Minimum price cannot be greater than maximum price.",
        400,
        "min_price"
      );
    }

    return this.productCatalogRepository.listApproved({
      page,
      limit,
      categoryId: input.categoryId,
      brandId: input.brandId,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      search: input.search?.trim() || undefined
    });
  }
}
