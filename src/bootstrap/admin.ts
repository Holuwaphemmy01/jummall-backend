import { Router } from "express";

import { ApproveProductPendingReview } from "../application/admin/approve-product-pending-review";
import { ApproveSellerKyc } from "../application/admin/approve-seller-kyc";
import { CreateCategoryShippingRule } from "../application/admin/create-category-shipping-rule";
import { CreateFreeShippingRule } from "../application/admin/create-free-shipping-rule";
import { CreateProductBrand } from "../application/admin/create-product-brand";
import { CreateProductCategory } from "../application/admin/create-product-category";
import { CreateShippingZone } from "../application/admin/create-shipping-zone";
import { CreateShippingZoneRule } from "../application/admin/create-shipping-zone-rule";
import { GetCategoryShippingRule } from "../application/admin/get-category-shipping-rule";
import { GetCompletedSellerKyc } from "../application/admin/get-completed-seller-kyc";
import { GetFreeShippingRule } from "../application/admin/get-free-shipping-rule";
import { GetProductBrand } from "../application/admin/get-product-brand";
import { GetProductPendingReviewDetail } from "../application/admin/get-product-pending-review-detail";
import { GetProductCategory } from "../application/admin/get-product-category";
import { GetShippingZone } from "../application/admin/get-shipping-zone";
import { GetShippingZoneRule } from "../application/admin/get-shipping-zone-rule";
import { GetShippingSettings } from "../application/admin/get-shipping-settings";
import { ListFreeShippingRules } from "../application/admin/list-free-shipping-rules";
import { ListCategoryShippingRules } from "../application/admin/list-category-shipping-rules";
import { ListProductBrands } from "../application/admin/list-product-brands";
import { ListCompletedSellerKyc } from "../application/admin/list-completed-seller-kyc";
import { ListProductsPendingReview } from "../application/admin/list-products-pending-review";
import { ListShippingZoneRules } from "../application/admin/list-shipping-zone-rules";
import { ListShippingZones } from "../application/admin/list-shipping-zones";
import { RejectProductPendingReview } from "../application/admin/reject-product-pending-review";
import { SetCategoryShippingRuleStatus } from "../application/admin/set-category-shipping-rule-status";
import { SetFreeShippingRuleStatus } from "../application/admin/set-free-shipping-rule-status";
import { SetShippingZoneRuleStatus } from "../application/admin/set-shipping-zone-rule-status";
import { SetShippingZoneStatus } from "../application/admin/set-shipping-zone-status";
import { UpdateCategoryShippingRule } from "../application/admin/update-category-shipping-rule";
import { UpdateFreeShippingRule } from "../application/admin/update-free-shipping-rule";
import { UpdateShippingZone } from "../application/admin/update-shipping-zone";
import { UpdateShippingZoneRule } from "../application/admin/update-shipping-zone-rule";
import { UpdateShippingSettings } from "../application/admin/update-shipping-settings";
import { UpdateProductBrand } from "../application/admin/update-product-brand";
import { ListProductCategories } from "../application/admin/list-product-categories";
import { UpdateProductCategory } from "../application/admin/update-product-category";
import { createAuthMiddleware } from "../infrastructure/api/middleware/create-auth-middleware";
import createAdminRouter from "../infrastructure/api/routes/admin-routes";
import { PostgresAdminKycRepository } from "../infrastructure/database/repositories/postgres-admin-kyc-repository";
import { PostgresCategoryShippingRuleRepository } from "../infrastructure/database/repositories/postgres-category-shipping-rule-repository";
import { PostgresFreeShippingRuleRepository } from "../infrastructure/database/repositories/postgres-free-shipping-rule-repository";
import { PostgresProductBrandRepository } from "../infrastructure/database/repositories/postgres-product-brand-repository";
import { PostgresProductCategoryRepository } from "../infrastructure/database/repositories/postgres-product-category-repository";
import { PostgresProductRepository } from "../infrastructure/database/repositories/postgres-product-repository";
import { PostgresShippingZoneRepository } from "../infrastructure/database/repositories/postgres-shipping-zone-repository";
import { PostgresShippingZoneRuleRepository } from "../infrastructure/database/repositories/postgres-shipping-zone-rule-repository";
import { PostgresShippingSettingsRepository } from "../infrastructure/database/repositories/postgres-shipping-settings-repository";
import { JwtTokenVerifier } from "../infrastructure/security/jwt-token-verifier";
import { SupabaseDocumentStorage } from "../infrastructure/storage/supabase-document-storage";

export function createAdminModule() {
  const adminRouter = Router();
  const adminKycRepository = new PostgresAdminKycRepository();
  const productBrandRepository = new PostgresProductBrandRepository();
  const productCategoryRepository = new PostgresProductCategoryRepository();
  const productRepository = new PostgresProductRepository();
  const shippingZoneRepository = new PostgresShippingZoneRepository();
  const shippingZoneRuleRepository = new PostgresShippingZoneRuleRepository();
  const categoryShippingRuleRepository =
    new PostgresCategoryShippingRuleRepository();
  const freeShippingRuleRepository = new PostgresFreeShippingRuleRepository();
  const shippingSettingsRepository = new PostgresShippingSettingsRepository();
  const documentStorage = new SupabaseDocumentStorage();
  const tokenVerifier = new JwtTokenVerifier();
  const authenticateAdmin = createAuthMiddleware(tokenVerifier, "admin");
  const approveProductPendingReview = new ApproveProductPendingReview(
    productRepository
  );
  const approveSellerKyc = new ApproveSellerKyc(adminKycRepository);
  const createCategoryShippingRule = new CreateCategoryShippingRule(
    categoryShippingRuleRepository,
    productCategoryRepository
  );
  const createFreeShippingRule = new CreateFreeShippingRule(
    freeShippingRuleRepository
  );
  const createProductBrand = new CreateProductBrand(
    productBrandRepository,
    documentStorage
  );
  const createProductCategory = new CreateProductCategory(
    productCategoryRepository,
    documentStorage
  );
  const createShippingZone = new CreateShippingZone(shippingZoneRepository);
  const createShippingZoneRule = new CreateShippingZoneRule(
    shippingZoneRuleRepository,
    shippingZoneRepository
  );
  const getCategoryShippingRule = new GetCategoryShippingRule(
    categoryShippingRuleRepository
  );
  const getFreeShippingRule = new GetFreeShippingRule(freeShippingRuleRepository);
  const listCompletedSellerKyc = new ListCompletedSellerKyc(adminKycRepository);
  const listFreeShippingRules = new ListFreeShippingRules(
    freeShippingRuleRepository
  );
  const listCategoryShippingRules = new ListCategoryShippingRules(
    categoryShippingRuleRepository
  );
  const listProductCategories = new ListProductCategories(
    productCategoryRepository
  );
  const listShippingZoneRules = new ListShippingZoneRules(
    shippingZoneRuleRepository
  );
  const listShippingZones = new ListShippingZones(shippingZoneRepository);
  const getCompletedSellerKyc = new GetCompletedSellerKyc(adminKycRepository);
  const getProductBrand = new GetProductBrand(productBrandRepository);
  const getProductPendingReviewDetail = new GetProductPendingReviewDetail(
    productRepository
  );
  const getProductCategory = new GetProductCategory(productCategoryRepository);
  const getShippingZone = new GetShippingZone(shippingZoneRepository);
  const getShippingZoneRule = new GetShippingZoneRule(
    shippingZoneRuleRepository
  );
  const getShippingSettings = new GetShippingSettings(shippingSettingsRepository);
  const listProductBrands = new ListProductBrands(productBrandRepository);
  const listProductsPendingReview = new ListProductsPendingReview(
    productRepository
  );
  const rejectProductPendingReview = new RejectProductPendingReview(
    productRepository
  );
  const setCategoryShippingRuleStatus = new SetCategoryShippingRuleStatus(
    categoryShippingRuleRepository
  );
  const setFreeShippingRuleStatus = new SetFreeShippingRuleStatus(
    freeShippingRuleRepository
  );
  const setShippingZoneRuleStatus = new SetShippingZoneRuleStatus(
    shippingZoneRuleRepository
  );
  const setShippingZoneStatus = new SetShippingZoneStatus(
    shippingZoneRepository
  );
  const updateCategoryShippingRule = new UpdateCategoryShippingRule(
    categoryShippingRuleRepository,
    productCategoryRepository
  );
  const updateFreeShippingRule = new UpdateFreeShippingRule(
    freeShippingRuleRepository
  );
  const updateProductBrand = new UpdateProductBrand(
    productBrandRepository,
    documentStorage
  );
  const updateProductCategory = new UpdateProductCategory(
    productCategoryRepository,
    documentStorage
  );
  const updateShippingZone = new UpdateShippingZone(shippingZoneRepository);
  const updateShippingZoneRule = new UpdateShippingZoneRule(
    shippingZoneRuleRepository,
    shippingZoneRepository
  );
  const updateShippingSettings = new UpdateShippingSettings(
    shippingSettingsRepository
  );

  adminRouter.use(authenticateAdmin);
  adminRouter.use(
    createAdminRouter({
      approveProductPendingReview,
      approveSellerKyc,
      createCategoryShippingRule,
      createFreeShippingRule,
      createProductBrand,
      createProductCategory,
      createShippingZone,
      createShippingZoneRule,
      getCategoryShippingRule,
      getFreeShippingRule,
      getProductBrand,
      getProductPendingReviewDetail,
      getShippingZone,
      getShippingZoneRule,
      getShippingSettings,
      listCompletedSellerKyc,
      listFreeShippingRules,
      listCategoryShippingRules,
      listProductBrands,
      listProductsPendingReview,
      listProductCategories,
      listShippingZoneRules,
      listShippingZones,
      rejectProductPendingReview,
      setCategoryShippingRuleStatus,
      setFreeShippingRuleStatus,
      setShippingZoneRuleStatus,
      setShippingZoneStatus,
      updateCategoryShippingRule,
      updateFreeShippingRule,
      getCompletedSellerKyc,
      getProductCategory,
      updateShippingZone,
      updateShippingZoneRule,
      updateShippingSettings,
      updateProductBrand,
      updateProductCategory
    })
  );

  return adminRouter;
}
