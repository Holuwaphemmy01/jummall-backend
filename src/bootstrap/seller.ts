import { Router } from "express";

import { PostgresAuthenticationRepository } from "../infrastructure/database/repositories/postgres-authentication-repository";
import { PostgresProductBrandRepository } from "../infrastructure/database/repositories/postgres-product-brand-repository";
import { PostgresProductCategoryRepository } from "../infrastructure/database/repositories/postgres-product-category-repository";
import { PostgresProductRepository } from "../infrastructure/database/repositories/postgres-product-repository";
import { InitiateEmailVerification } from "../application/auth/initiate-email-verification";
import { SendWelcomeEmail } from "../application/notification/send-welcome-email";
import { CreateSellerCategoryShippingRule } from "../application/seller/create-category-shipping-rule";
import { CreateSellerShippingZone } from "../application/seller/create-shipping-zone";
import { CreateSellerShippingZoneRule } from "../application/seller/create-shipping-zone-rule";
import { GetSellerOrderDetail } from "../application/seller/get-order-detail";
import { GetSellerCategoryShippingRule } from "../application/seller/get-category-shipping-rule";
import { GetSellerShippingZone } from "../application/seller/get-shipping-zone";
import { GetSellerShippingZoneRule } from "../application/seller/get-shipping-zone-rule";
import { ListAvailableProductBrands } from "../application/seller/list-available-product-brands";
import { ListAvailableProductCategories } from "../application/seller/list-available-product-categories";
import { ListSellerCategoryShippingRules } from "../application/seller/list-category-shipping-rules";
import { ListSellerOrders } from "../application/seller/list-orders";
import { ListSellerProducts } from "../application/seller/list-seller-products";
import { ListSellerShippingZoneRules } from "../application/seller/list-shipping-zone-rules";
import { ListSellerShippingZones } from "../application/seller/list-shipping-zones";
import { RegisterSeller } from "../application/seller/register-seller";
import { SetSellerCategoryShippingRuleStatus } from "../application/seller/set-category-shipping-rule-status";
import { SetSellerShippingZoneStatus } from "../application/seller/set-shipping-zone-status";
import { SetSellerShippingZoneRuleStatus } from "../application/seller/set-shipping-zone-rule-status";
import { UpdateSellerOrderItemDeliveryStatus } from "../application/seller/update-order-item-delivery-status";
import { UpdateSellerCategoryShippingRule } from "../application/seller/update-category-shipping-rule";
import { UpdateSellerShippingZone } from "../application/seller/update-shipping-zone";
import { UpdateSellerShippingZoneRule } from "../application/seller/update-shipping-zone-rule";
import { UploadProduct } from "../application/seller/upload-product";
import { SaveSellerKycDraft } from "../application/seller-kyc/save-seller-kyc-draft";
import { SubmitSellerKyc } from "../application/seller-kyc/submit-seller-kyc";
import { UploadSellerKycDocument } from "../application/seller-kyc/upload-seller-kyc-document";
import { createAuthMiddleware } from "../infrastructure/api/middleware/create-auth-middleware";
import createSellerKycRouter from "../infrastructure/api/routes/seller-kyc-routes";
import createSellerRouter, {
  createProtectedSellerBrandRouter,
  createProtectedSellerCategoryRouter,
  createProtectedSellerOrderRouter,
  createProtectedSellerProductListRouter,
  createProtectedSellerProductRouter,
  createProtectedSellerShippingRouter
} from "../infrastructure/api/routes/seller-routes";
import { PostgresEmailVerificationRepository } from "../infrastructure/database/repositories/postgres-email-verification-repository";
import { PostgresCategoryShippingRuleRepository } from "../infrastructure/database/repositories/postgres-category-shipping-rule-repository";
import { PostgresOrderRepository } from "../infrastructure/database/repositories/postgres-order-repository";
import { PostgresSellerKycRepository } from "../infrastructure/database/repositories/postgres-seller-kyc-repository";
import { PostgresSellerRepository } from "../infrastructure/database/repositories/postgres-seller-repository";
import { PostgresShippingSettingsRepository } from "../infrastructure/database/repositories/postgres-shipping-settings-repository";
import { PostgresShippingZoneRepository } from "../infrastructure/database/repositories/postgres-shipping-zone-repository";
import { PostgresShippingZoneRuleRepository } from "../infrastructure/database/repositories/postgres-shipping-zone-rule-repository";
import { createMailProvider } from "../infrastructure/notification/create-mail-provider";
import { SupabaseDocumentStorage } from "../infrastructure/storage/supabase-document-storage";
import { JwtTokenVerifier } from "../infrastructure/security/jwt-token-verifier";
import { NumericVerificationCodeGenerator } from "../infrastructure/security/numeric-verification-code-generator";
import { RandomProductSkuGenerator } from "../infrastructure/security/random-product-sku-generator";
import { ScryptPasswordHasher } from "../infrastructure/security/scrypt-password-hasher";

export function createSellerModule() {
  const sellerRouter = Router();
  const authenticationRepository = new PostgresAuthenticationRepository();
  const productBrandRepository = new PostgresProductBrandRepository();
  const productCategoryRepository = new PostgresProductCategoryRepository();
  const orderRepository = new PostgresOrderRepository();
  const productRepository = new PostgresProductRepository();
  const sellerRepository = new PostgresSellerRepository();
  const sellerKycRepository = new PostgresSellerKycRepository();
  const shippingZoneRepository = new PostgresShippingZoneRepository();
  const shippingZoneRuleRepository = new PostgresShippingZoneRuleRepository();
  const categoryShippingRuleRepository =
    new PostgresCategoryShippingRuleRepository();
  const shippingSettingsRepository = new PostgresShippingSettingsRepository();
  const emailVerificationRepository = new PostgresEmailVerificationRepository();
  const passwordHasher = new ScryptPasswordHasher();
  const verificationCodeGenerator = new NumericVerificationCodeGenerator();
  const productSkuGenerator = new RandomProductSkuGenerator();
  const mailProvider = createMailProvider();
  const tokenVerifier = new JwtTokenVerifier();
  const documentStorage = new SupabaseDocumentStorage();
  const sendWelcomeEmail = new SendWelcomeEmail(mailProvider);
  const initiateEmailVerification = new InitiateEmailVerification(
    emailVerificationRepository,
    verificationCodeGenerator,
    mailProvider,
    Number(process.env.EMAIL_VERIFICATION_CODE_TTL_MINUTES ?? 15)
  );
  const registerSeller = new RegisterSeller(
    sellerRepository,
    passwordHasher,
    initiateEmailVerification,
    sendWelcomeEmail
  );
  const saveSellerKycDraft = new SaveSellerKycDraft(sellerKycRepository);
  const listAvailableProductBrands = new ListAvailableProductBrands(
    productBrandRepository
  );
  const listAvailableProductCategories = new ListAvailableProductCategories(
    productCategoryRepository
  );
  const createSellerShippingZone = new CreateSellerShippingZone(
    authenticationRepository,
    shippingSettingsRepository,
    shippingZoneRepository
  );
  const listSellerShippingZones = new ListSellerShippingZones(
    authenticationRepository,
    shippingSettingsRepository,
    shippingZoneRepository
  );
  const getSellerShippingZone = new GetSellerShippingZone(
    authenticationRepository,
    shippingSettingsRepository,
    shippingZoneRepository
  );
  const updateSellerShippingZone = new UpdateSellerShippingZone(
    authenticationRepository,
    shippingSettingsRepository,
    shippingZoneRepository
  );
  const setSellerShippingZoneStatus = new SetSellerShippingZoneStatus(
    authenticationRepository,
    shippingSettingsRepository,
    shippingZoneRepository
  );
  const createSellerShippingZoneRule = new CreateSellerShippingZoneRule(
    authenticationRepository,
    shippingSettingsRepository,
    shippingZoneRepository,
    shippingZoneRuleRepository
  );
  const listSellerShippingZoneRules = new ListSellerShippingZoneRules(
    authenticationRepository,
    shippingSettingsRepository,
    shippingZoneRuleRepository
  );
  const getSellerShippingZoneRule = new GetSellerShippingZoneRule(
    authenticationRepository,
    shippingSettingsRepository,
    shippingZoneRuleRepository
  );
  const updateSellerShippingZoneRule = new UpdateSellerShippingZoneRule(
    authenticationRepository,
    shippingSettingsRepository,
    shippingZoneRepository,
    shippingZoneRuleRepository
  );
  const setSellerShippingZoneRuleStatus = new SetSellerShippingZoneRuleStatus(
    authenticationRepository,
    shippingSettingsRepository,
    shippingZoneRuleRepository
  );
  const createSellerCategoryShippingRule = new CreateSellerCategoryShippingRule(
    authenticationRepository,
    shippingSettingsRepository,
    productCategoryRepository,
    categoryShippingRuleRepository
  );
  const listSellerCategoryShippingRules = new ListSellerCategoryShippingRules(
    authenticationRepository,
    shippingSettingsRepository,
    categoryShippingRuleRepository
  );
  const getSellerCategoryShippingRule = new GetSellerCategoryShippingRule(
    authenticationRepository,
    shippingSettingsRepository,
    categoryShippingRuleRepository
  );
  const updateSellerCategoryShippingRule = new UpdateSellerCategoryShippingRule(
    authenticationRepository,
    shippingSettingsRepository,
    productCategoryRepository,
    categoryShippingRuleRepository
  );
  const setSellerCategoryShippingRuleStatus =
    new SetSellerCategoryShippingRuleStatus(
      authenticationRepository,
      shippingSettingsRepository,
      categoryShippingRuleRepository
    );
  const listSellerProducts = new ListSellerProducts(
    authenticationRepository,
    productRepository
  );
  const listSellerOrders = new ListSellerOrders(
    authenticationRepository,
    orderRepository
  );
  const getSellerOrderDetail = new GetSellerOrderDetail(
    authenticationRepository,
    orderRepository
  );
  const updateSellerOrderItemDeliveryStatus =
    new UpdateSellerOrderItemDeliveryStatus(
      authenticationRepository,
      orderRepository
    );
  const uploadSellerKycDocument = new UploadSellerKycDocument(
    sellerKycRepository,
    documentStorage
  );
  const uploadProduct = new UploadProduct(
    authenticationRepository,
    sellerKycRepository,
    productBrandRepository,
    productCategoryRepository,
    productRepository,
    documentStorage,
    productSkuGenerator
  );
  const submitSellerKyc = new SubmitSellerKyc(sellerKycRepository);
  const authenticateSeller = createAuthMiddleware(tokenVerifier, "seller");

  sellerRouter.use(createSellerRouter({ registerSeller }));
  sellerRouter.use(
    "/product-brands",
    authenticateSeller,
    createProtectedSellerBrandRouter({ listAvailableProductBrands })
  );
  sellerRouter.use(
    "/product-categories",
    authenticateSeller,
    createProtectedSellerCategoryRouter({ listAvailableProductCategories })
  );
  sellerRouter.use(
    "/get-all-products",
    authenticateSeller,
    createProtectedSellerProductListRouter({ listSellerProducts })
  );
  sellerRouter.use(
    "/orders",
    authenticateSeller,
    createProtectedSellerOrderRouter({
      listSellerOrders,
      getSellerOrderDetail,
      updateSellerOrderItemDeliveryStatus
    })
  );
  sellerRouter.use(
    "/create-product",
    authenticateSeller,
    createProtectedSellerProductRouter({ uploadProduct })
  );
  sellerRouter.use(
    "/kyc",
    authenticateSeller,
    createSellerKycRouter({
      saveSellerKycDraft,
      uploadSellerKycDocument,
      submitSellerKyc
    })
  );
  sellerRouter.use(
    "/shipping",
    authenticateSeller,
    createProtectedSellerShippingRouter({
      createCategoryShippingRule: createSellerCategoryShippingRule,
      createShippingZone: createSellerShippingZone,
      createShippingZoneRule: createSellerShippingZoneRule,
      getCategoryShippingRule: getSellerCategoryShippingRule,
      getShippingZone: getSellerShippingZone,
      getShippingZoneRule: getSellerShippingZoneRule,
      listCategoryShippingRules: listSellerCategoryShippingRules,
      listShippingZoneRules: listSellerShippingZoneRules,
      listShippingZones: listSellerShippingZones,
      setCategoryShippingRuleStatus: setSellerCategoryShippingRuleStatus,
      setShippingZoneStatus: setSellerShippingZoneStatus,
      setShippingZoneRuleStatus: setSellerShippingZoneRuleStatus,
      updateCategoryShippingRule: updateSellerCategoryShippingRule,
      updateShippingZone: updateSellerShippingZone,
      updateShippingZoneRule: updateSellerShippingZoneRule
    })
  );

  return sellerRouter;
}
