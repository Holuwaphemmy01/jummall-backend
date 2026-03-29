import { ListApprovedProducts } from "../application/product/list-approved-products";
import createProductRouter from "../infrastructure/api/routes/product-routes";
import { PostgresProductCatalogRepository } from "../infrastructure/database/repositories/postgres-product-catalog-repository";

export function createProductModule() {
  const productCatalogRepository = new PostgresProductCatalogRepository();
  const listApprovedProducts = new ListApprovedProducts(productCatalogRepository);

  return createProductRouter({
    listApprovedProducts
  });
}
