import { Router } from "express";

import { PostgresAuthenticationRepository } from "../infrastructure/database/repositories/postgres-authentication-repository";
import { PostgresProductBrandRepository } from "../infrastructure/database/repositories/postgres-product-brand-repository";
import { PostgresProductCategoryRepository } from "../infrastructure/database/repositories/postgres-product-category-repository";
import { PostgresProductRepository } from "../infrastructure/database/repositories/postgres-product-repository";
import { InitiateEmailVerification } from "../application/auth/initiate-email-verification";
import { SendWelcomeEmail } from "../application/notification/send-welcome-email";
import { ListAvailableProductBrands } from "../application/seller/list-available-product-brands";
import { ListAvailableProductCategories } from "../application/seller/list-available-product-categories";
import { RegisterSeller } from "../application/seller/register-seller";
import { UploadProduct } from "../application/seller/upload-product";
import { SaveSellerKycDraft } from "../application/seller-kyc/save-seller-kyc-draft";
import { SubmitSellerKyc } from "../application/seller-kyc/submit-seller-kyc";
import { UploadSellerKycDocument } from "../application/seller-kyc/upload-seller-kyc-document";
import { createAuthMiddleware } from "../infrastructure/api/middleware/create-auth-middleware";
import createSellerKycRouter from "../infrastructure/api/routes/seller-kyc-routes";
import createSellerRouter, {
  createProtectedSellerBrandRouter,
  createProtectedSellerCategoryRouter,
  createProtectedSellerProductRouter
} from "../infrastructure/api/routes/seller-routes";
import { PostgresEmailVerificationRepository } from "../infrastructure/database/repositories/postgres-email-verification-repository";
import { PostgresSellerKycRepository } from "../infrastructure/database/repositories/postgres-seller-kyc-repository";
import { PostgresSellerRepository } from "../infrastructure/database/repositories/postgres-seller-repository";
import { ResendMailProvider } from "../infrastructure/notification/resend-mail-provider";
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
  const productRepository = new PostgresProductRepository();
  const sellerRepository = new PostgresSellerRepository();
  const sellerKycRepository = new PostgresSellerKycRepository();
  const emailVerificationRepository = new PostgresEmailVerificationRepository();
  const passwordHasher = new ScryptPasswordHasher();
  const verificationCodeGenerator = new NumericVerificationCodeGenerator();
  const productSkuGenerator = new RandomProductSkuGenerator();
  const mailProvider = new ResendMailProvider();
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

  return sellerRouter;
}
