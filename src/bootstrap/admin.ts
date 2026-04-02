import { Router } from "express";

import { ApproveProductPendingReview } from "../application/admin/approve-product-pending-review";
import { ApproveSellerKyc } from "../application/admin/approve-seller-kyc";
import { CreateProductBrand } from "../application/admin/create-product-brand";
import { CreateProductCategory } from "../application/admin/create-product-category";
import { GetCompletedSellerKyc } from "../application/admin/get-completed-seller-kyc";
import { GetProductBrand } from "../application/admin/get-product-brand";
import { GetProductPendingReviewDetail } from "../application/admin/get-product-pending-review-detail";
import { GetProductCategory } from "../application/admin/get-product-category";
import { GetShippingSettings } from "../application/admin/get-shipping-settings";
import { ListProductBrands } from "../application/admin/list-product-brands";
import { ListCompletedSellerKyc } from "../application/admin/list-completed-seller-kyc";
import { ListProductsPendingReview } from "../application/admin/list-products-pending-review";
import { RejectProductPendingReview } from "../application/admin/reject-product-pending-review";
import { UpdateShippingSettings } from "../application/admin/update-shipping-settings";
import { UpdateProductBrand } from "../application/admin/update-product-brand";
import { ListProductCategories } from "../application/admin/list-product-categories";
import { UpdateProductCategory } from "../application/admin/update-product-category";
import { createAuthMiddleware } from "../infrastructure/api/middleware/create-auth-middleware";
import createAdminRouter from "../infrastructure/api/routes/admin-routes";
import { PostgresAdminKycRepository } from "../infrastructure/database/repositories/postgres-admin-kyc-repository";
import { PostgresProductBrandRepository } from "../infrastructure/database/repositories/postgres-product-brand-repository";
import { PostgresProductCategoryRepository } from "../infrastructure/database/repositories/postgres-product-category-repository";
import { PostgresProductRepository } from "../infrastructure/database/repositories/postgres-product-repository";
import { PostgresShippingSettingsRepository } from "../infrastructure/database/repositories/postgres-shipping-settings-repository";
import { JwtTokenVerifier } from "../infrastructure/security/jwt-token-verifier";

export function createAdminModule() {
  const adminRouter = Router();
  const adminKycRepository = new PostgresAdminKycRepository();
  const productBrandRepository = new PostgresProductBrandRepository();
  const productCategoryRepository = new PostgresProductCategoryRepository();
  const productRepository = new PostgresProductRepository();
  const shippingSettingsRepository = new PostgresShippingSettingsRepository();
  const tokenVerifier = new JwtTokenVerifier();
  const authenticateAdmin = createAuthMiddleware(tokenVerifier, "admin");
  const approveProductPendingReview = new ApproveProductPendingReview(
    productRepository
  );
  const approveSellerKyc = new ApproveSellerKyc(adminKycRepository);
  const createProductBrand = new CreateProductBrand(productBrandRepository);
  const createProductCategory = new CreateProductCategory(
    productCategoryRepository
  );
  const listCompletedSellerKyc = new ListCompletedSellerKyc(adminKycRepository);
  const listProductCategories = new ListProductCategories(
    productCategoryRepository
  );
  const getCompletedSellerKyc = new GetCompletedSellerKyc(adminKycRepository);
  const getProductBrand = new GetProductBrand(productBrandRepository);
  const getProductPendingReviewDetail = new GetProductPendingReviewDetail(
    productRepository
  );
  const getProductCategory = new GetProductCategory(productCategoryRepository);
  const getShippingSettings = new GetShippingSettings(shippingSettingsRepository);
  const listProductBrands = new ListProductBrands(productBrandRepository);
  const listProductsPendingReview = new ListProductsPendingReview(
    productRepository
  );
  const rejectProductPendingReview = new RejectProductPendingReview(
    productRepository
  );
  const updateProductBrand = new UpdateProductBrand(productBrandRepository);
  const updateProductCategory = new UpdateProductCategory(
    productCategoryRepository
  );
  const updateShippingSettings = new UpdateShippingSettings(
    shippingSettingsRepository
  );

  adminRouter.use(authenticateAdmin);
  adminRouter.use(
    createAdminRouter({
      approveProductPendingReview,
      approveSellerKyc,
      createProductBrand,
      createProductCategory,
      getProductBrand,
      getProductPendingReviewDetail,
      getShippingSettings,
      listCompletedSellerKyc,
      listProductBrands,
      listProductsPendingReview,
      listProductCategories,
      rejectProductPendingReview,
      getCompletedSellerKyc,
      getProductCategory,
      updateShippingSettings,
      updateProductBrand,
      updateProductCategory
    })
  );

  return adminRouter;
}
