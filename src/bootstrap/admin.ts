import { Router } from "express";

import { ApproveProductPendingReview } from "../application/admin/approve-product-pending-review";
import { ApproveSellerKyc } from "../application/admin/approve-seller-kyc";
import { CreateProductCategory } from "../application/admin/create-product-category";
import { GetCompletedSellerKyc } from "../application/admin/get-completed-seller-kyc";
import { GetProductPendingReviewDetail } from "../application/admin/get-product-pending-review-detail";
import { GetProductCategory } from "../application/admin/get-product-category";
import { ListCompletedSellerKyc } from "../application/admin/list-completed-seller-kyc";
import { ListProductsPendingReview } from "../application/admin/list-products-pending-review";
import { RejectProductPendingReview } from "../application/admin/reject-product-pending-review";
import { ListProductCategories } from "../application/admin/list-product-categories";
import { UpdateProductCategory } from "../application/admin/update-product-category";
import { createAuthMiddleware } from "../infrastructure/api/middleware/create-auth-middleware";
import createAdminRouter from "../infrastructure/api/routes/admin-routes";
import { PostgresAdminKycRepository } from "../infrastructure/database/repositories/postgres-admin-kyc-repository";
import { PostgresProductCategoryRepository } from "../infrastructure/database/repositories/postgres-product-category-repository";
import { PostgresProductRepository } from "../infrastructure/database/repositories/postgres-product-repository";
import { JwtTokenVerifier } from "../infrastructure/security/jwt-token-verifier";

export function createAdminModule() {
  const adminRouter = Router();
  const adminKycRepository = new PostgresAdminKycRepository();
  const productCategoryRepository = new PostgresProductCategoryRepository();
  const productRepository = new PostgresProductRepository();
  const tokenVerifier = new JwtTokenVerifier();
  const authenticateAdmin = createAuthMiddleware(tokenVerifier, "admin");
  const approveProductPendingReview = new ApproveProductPendingReview(
    productRepository
  );
  const approveSellerKyc = new ApproveSellerKyc(adminKycRepository);
  const createProductCategory = new CreateProductCategory(
    productCategoryRepository
  );
  const listCompletedSellerKyc = new ListCompletedSellerKyc(adminKycRepository);
  const listProductCategories = new ListProductCategories(
    productCategoryRepository
  );
  const getCompletedSellerKyc = new GetCompletedSellerKyc(adminKycRepository);
  const getProductPendingReviewDetail = new GetProductPendingReviewDetail(
    productRepository
  );
  const getProductCategory = new GetProductCategory(productCategoryRepository);
  const listProductsPendingReview = new ListProductsPendingReview(
    productRepository
  );
  const rejectProductPendingReview = new RejectProductPendingReview(
    productRepository
  );
  const updateProductCategory = new UpdateProductCategory(
    productCategoryRepository
  );

  adminRouter.use(authenticateAdmin);
  adminRouter.use(
    createAdminRouter({
      approveProductPendingReview,
      approveSellerKyc,
      createProductCategory,
      getProductPendingReviewDetail,
      listCompletedSellerKyc,
      listProductsPendingReview,
      listProductCategories,
      rejectProductPendingReview,
      getCompletedSellerKyc,
      getProductCategory,
      updateProductCategory
    })
  );

  return adminRouter;
}
