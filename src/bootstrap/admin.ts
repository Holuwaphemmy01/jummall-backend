import { Router } from "express";

import { ApproveSellerKyc } from "../application/admin/approve-seller-kyc";
import { CreateProductCategory } from "../application/admin/create-product-category";
import { GetCompletedSellerKyc } from "../application/admin/get-completed-seller-kyc";
import { GetProductCategory } from "../application/admin/get-product-category";
import { ListCompletedSellerKyc } from "../application/admin/list-completed-seller-kyc";
import { ListProductCategories } from "../application/admin/list-product-categories";
import { UpdateProductCategory } from "../application/admin/update-product-category";
import { createAuthMiddleware } from "../infrastructure/api/middleware/create-auth-middleware";
import createAdminRouter from "../infrastructure/api/routes/admin-routes";
import { PostgresAdminKycRepository } from "../infrastructure/database/repositories/postgres-admin-kyc-repository";
import { PostgresProductCategoryRepository } from "../infrastructure/database/repositories/postgres-product-category-repository";
import { JwtTokenVerifier } from "../infrastructure/security/jwt-token-verifier";

export function createAdminModule() {
  const adminRouter = Router();
  const adminKycRepository = new PostgresAdminKycRepository();
  const productCategoryRepository = new PostgresProductCategoryRepository();
  const tokenVerifier = new JwtTokenVerifier();
  const authenticateAdmin = createAuthMiddleware(tokenVerifier, "admin");
  const approveSellerKyc = new ApproveSellerKyc(adminKycRepository);
  const createProductCategory = new CreateProductCategory(
    productCategoryRepository
  );
  const listCompletedSellerKyc = new ListCompletedSellerKyc(adminKycRepository);
  const listProductCategories = new ListProductCategories(
    productCategoryRepository
  );
  const getCompletedSellerKyc = new GetCompletedSellerKyc(adminKycRepository);
  const getProductCategory = new GetProductCategory(productCategoryRepository);
  const updateProductCategory = new UpdateProductCategory(
    productCategoryRepository
  );

  adminRouter.use(authenticateAdmin);
  adminRouter.use(
    createAdminRouter({
      approveSellerKyc,
      createProductCategory,
      listCompletedSellerKyc,
      listProductCategories,
      getCompletedSellerKyc
      ,getProductCategory,
      updateProductCategory
    })
  );

  return adminRouter;
}
