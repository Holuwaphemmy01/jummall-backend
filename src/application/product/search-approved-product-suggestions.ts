import type {
  ProductCatalogRepository
} from "../../ports/product-catalog-repository";
import type { ProductRecord } from "../../ports/product-repository";

export interface SearchApprovedProductSuggestionsInput {
  query: string;
  limit?: number;
}

export interface SearchApprovedProductSuggestionsUseCase {
  execute(input: SearchApprovedProductSuggestionsInput): Promise<ProductRecord[]>;
}

export class SearchApprovedProductSuggestionsError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "SearchApprovedProductSuggestionsError";
  }
}

export class SearchApprovedProductSuggestions
  implements SearchApprovedProductSuggestionsUseCase
{
  constructor(private readonly productCatalogRepository: ProductCatalogRepository) {}

  async execute(
    input: SearchApprovedProductSuggestionsInput
  ): Promise<ProductRecord[]> {
    const query = input.query.trim();
    const limit = input.limit ?? 10;

    if (query.length < 1) {
      throw new SearchApprovedProductSuggestionsError(
        "Search query is required.",
        400,
        "query"
      );
    }

    if (limit < 1 || limit > 20) {
      throw new SearchApprovedProductSuggestionsError(
        "Limit must be between 1 and 20.",
        400,
        "limit"
      );
    }

    return this.productCatalogRepository.searchApprovedSuggestions({
      query,
      limit
    });
  }
}
