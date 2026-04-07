import { GetApprovedProductDetail } from "../application/product/get-approved-product-detail";
import { ListApprovedProducts } from "../application/product/list-approved-products";
import { ListApprovedProductsByBrandName } from "../application/product/list-approved-products-by-brand-name";
import { ListApprovedProductsByCategory } from "../application/product/list-approved-products-by-category";
import { SearchApprovedProductSuggestions } from "../application/product/search-approved-product-suggestions";
import { ListActiveSliders } from "../application/slider/list-active-sliders";
import createProductRouter from "../infrastructure/api/routes/product-routes";
import { PostgresProductCatalogRepository } from "../infrastructure/database/repositories/postgres-product-catalog-repository";
import { PostgresProductBrandRepository } from "../infrastructure/database/repositories/postgres-product-brand-repository";
import { PostgresProductCategoryRepository } from "../infrastructure/database/repositories/postgres-product-category-repository";
import { PostgresSliderRepository } from "../infrastructure/database/repositories/postgres-slider-repository";

export function createProductModule() {
  const productBrandRepository = new PostgresProductBrandRepository();
  const productCatalogRepository = new PostgresProductCatalogRepository();
  const productCategoryRepository = new PostgresProductCategoryRepository();
  const sliderRepository = new PostgresSliderRepository();
  const getApprovedProductDetail = new GetApprovedProductDetail(
    productCatalogRepository
  );
  const listActiveSliders = new ListActiveSliders(sliderRepository);
  const listApprovedProducts = new ListApprovedProducts(productCatalogRepository);
  const listApprovedProductsByBrandName = new ListApprovedProductsByBrandName(
    productBrandRepository,
    productCatalogRepository
  );
  const listApprovedProductsByCategory = new ListApprovedProductsByCategory(
    productCategoryRepository,
    productCatalogRepository
  );
  const searchApprovedProductSuggestions = new SearchApprovedProductSuggestions(
    productCatalogRepository
  );

  return createProductRouter({
    getApprovedProductDetail,
    listActiveSliders,
    listApprovedProducts,
    listApprovedProductsByBrandName,
    listApprovedProductsByCategory,
    searchApprovedProductSuggestions
  });
}
