import { ListApprovedProducts } from "../application/product/list-approved-products";
import { ListApprovedProductsByCategory } from "../application/product/list-approved-products-by-category";
import { SearchApprovedProductSuggestions } from "../application/product/search-approved-product-suggestions";
import createProductRouter from "../infrastructure/api/routes/product-routes";
import { PostgresProductCatalogRepository } from "../infrastructure/database/repositories/postgres-product-catalog-repository";
import { PostgresProductCategoryRepository } from "../infrastructure/database/repositories/postgres-product-category-repository";

export function createProductModule() {
  const productCatalogRepository = new PostgresProductCatalogRepository();
  const productCategoryRepository = new PostgresProductCategoryRepository();
  const listApprovedProducts = new ListApprovedProducts(productCatalogRepository);
  const listApprovedProductsByCategory = new ListApprovedProductsByCategory(
    productCategoryRepository,
    productCatalogRepository
  );
  const searchApprovedProductSuggestions = new SearchApprovedProductSuggestions(
    productCatalogRepository
  );

  return createProductRouter({
    listApprovedProducts,
    listApprovedProductsByCategory,
    searchApprovedProductSuggestions
  });
}
