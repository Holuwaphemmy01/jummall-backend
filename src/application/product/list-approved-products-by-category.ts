import type {
  ApprovedProductCatalogPage,
  ProductCatalogRepository
} from "../../ports/product-catalog-repository";
import type { ProductCategoryRepository } from "../../ports/product-category-repository";

export interface ListApprovedProductsByCategoryInput {
  categoryId: string;
  page?: number;
  limit?: number;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export interface ListApprovedProductsByCategoryUseCase {
  execute(
    input: ListApprovedProductsByCategoryInput
  ): Promise<ApprovedProductCatalogPage>;
}

export class ListApprovedProductsByCategoryError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ListApprovedProductsByCategoryError";
  }
}

export class ListApprovedProductsByCategory
  implements ListApprovedProductsByCategoryUseCase
{
  constructor(
    private readonly productCategoryRepository: ProductCategoryRepository,
    private readonly productCatalogRepository: ProductCatalogRepository
  ) {}

  async execute(
    input: ListApprovedProductsByCategoryInput
  ): Promise<ApprovedProductCatalogPage> {
    const category = await this.productCategoryRepository.findById(input.categoryId);

    if (!category) {
      throw new ListApprovedProductsByCategoryError(
        "Product category not found.",
        404,
        "category_id"
      );
    }

    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    if (page < 1) {
      throw new ListApprovedProductsByCategoryError(
        "Page must be greater than or equal to 1.",
        400,
        "page"
      );
    }

    if (limit < 1 || limit > 100) {
      throw new ListApprovedProductsByCategoryError(
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
      throw new ListApprovedProductsByCategoryError(
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
