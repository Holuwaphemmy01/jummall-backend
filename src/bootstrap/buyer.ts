import { AddProductToCart } from "../application/buyer/add-product-to-cart";
import { AddProductToWishlist } from "../application/buyer/add-product-to-wishlist";
import { InitiateEmailVerification } from "../application/auth/initiate-email-verification";
import { RemoveProductFromCart } from "../application/buyer/remove-product-from-cart";
import { RemoveProductFromWishlist } from "../application/buyer/remove-product-from-wishlist";
import { RegisterBuyer } from "../application/buyer/register-buyer";
import { SendWelcomeEmail } from "../application/notification/send-welcome-email";
import { createAuthMiddleware } from "../infrastructure/api/middleware/create-auth-middleware";
import createBuyerRouter, {
  createProtectedBuyerCartRouter,
  createProtectedBuyerWishlistRouter
} from "../infrastructure/api/routes/buyer-routes";
import { PostgresAuthenticationRepository } from "../infrastructure/database/repositories/postgres-authentication-repository";
import { PostgresBuyerRepository } from "../infrastructure/database/repositories/postgres-buyer-repository";
import { PostgresCartRepository } from "../infrastructure/database/repositories/postgres-cart-repository";
import { PostgresEmailVerificationRepository } from "../infrastructure/database/repositories/postgres-email-verification-repository";
import { PostgresProductRepository } from "../infrastructure/database/repositories/postgres-product-repository";
import { PostgresWishlistRepository } from "../infrastructure/database/repositories/postgres-wishlist-repository";
import { ResendMailProvider } from "../infrastructure/notification/resend-mail-provider";
import { JwtTokenVerifier } from "../infrastructure/security/jwt-token-verifier";
import { NumericVerificationCodeGenerator } from "../infrastructure/security/numeric-verification-code-generator";
import { ScryptPasswordHasher } from "../infrastructure/security/scrypt-password-hasher";
import { Router } from "express";

export function createBuyerModule() {
  const buyerRouter = Router();
  const authenticationRepository = new PostgresAuthenticationRepository();
  const buyerRepository = new PostgresBuyerRepository();
  const cartRepository = new PostgresCartRepository();
  const emailVerificationRepository = new PostgresEmailVerificationRepository();
  const productRepository = new PostgresProductRepository();
  const wishlistRepository = new PostgresWishlistRepository();
  const passwordHasher = new ScryptPasswordHasher();
  const verificationCodeGenerator = new NumericVerificationCodeGenerator();
  const mailProvider = new ResendMailProvider();
  const tokenVerifier = new JwtTokenVerifier();
  const sendWelcomeEmail = new SendWelcomeEmail(mailProvider);
  const initiateEmailVerification = new InitiateEmailVerification(
    emailVerificationRepository,
    verificationCodeGenerator,
    mailProvider,
    Number(process.env.EMAIL_VERIFICATION_CODE_TTL_MINUTES ?? 15)
  );
  const registerBuyer = new RegisterBuyer(
    buyerRepository,
    passwordHasher,
    initiateEmailVerification,
    sendWelcomeEmail
  );
  const addProductToWishlist = new AddProductToWishlist(
    authenticationRepository,
    productRepository,
    wishlistRepository
  );
  const addProductToCart = new AddProductToCart(
    authenticationRepository,
    productRepository,
    cartRepository
  );
  const removeProductFromCart = new RemoveProductFromCart(
    authenticationRepository,
    cartRepository
  );
  const removeProductFromWishlist = new RemoveProductFromWishlist(
    authenticationRepository,
    wishlistRepository
  );
  const authenticateBuyer = createAuthMiddleware(tokenVerifier, "buyer");

  buyerRouter.use(createBuyerRouter({ registerBuyer }));
  buyerRouter.use(
    "/cart",
    authenticateBuyer,
    createProtectedBuyerCartRouter({
      addProductToCart,
      removeProductFromCart
    })
  );
  buyerRouter.use(
    "/wishlist",
    authenticateBuyer,
    createProtectedBuyerWishlistRouter({
      addProductToWishlist,
      removeProductFromWishlist
    })
  );

  return buyerRouter;
}
