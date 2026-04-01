import type { ProductRecord } from "./product-repository";

export interface ListApprovedProductsInput {
  page: number;
  limit: number;
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export interface ApprovedProductCatalogPage {
  items: ProductRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductCatalogRepository {
  listApproved(
    input: ListApprovedProductsInput
  ): Promise<ApprovedProductCatalogPage>;
  findApprovedById(productId: string): Promise<ProductRecord | null>;
  searchApprovedSuggestions(input: {
    query: string;
    limit: number;
  }): Promise<ProductRecord[]>;
}
