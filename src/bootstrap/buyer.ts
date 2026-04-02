import { AddProductToCart } from "../application/buyer/add-product-to-cart";
import { AddBillingAddress } from "../application/buyer/add-billing-address";
import { AddProductToWishlist } from "../application/buyer/add-product-to-wishlist";
import { ClearBuyerCart } from "../application/buyer/clear-buyer-cart";
import { DeleteBillingAddress } from "../application/buyer/delete-billing-address";
import { GetActiveCart } from "../application/buyer/get-active-cart";
import { GetBillingAddresses } from "../application/buyer/get-billing-addresses";
import { GetBuyerWishlist } from "../application/buyer/get-buyer-wishlist";
import { InitiateEmailVerification } from "../application/auth/initiate-email-verification";
import { RemoveProductFromCart } from "../application/buyer/remove-product-from-cart";
import { RemoveProductFromWishlist } from "../application/buyer/remove-product-from-wishlist";
import { RegisterBuyer } from "../application/buyer/register-buyer";
import { UpdateProductQuantityInCart } from "../application/buyer/update-product-quantity-in-cart";
import { SendWelcomeEmail } from "../application/notification/send-welcome-email";
import { createAuthMiddleware } from "../infrastructure/api/middleware/create-auth-middleware";
import createBuyerRouter, {
  createProtectedBuyerBillingAddressRouter,
  createProtectedBuyerCartRouter,
  createProtectedBuyerWishlistRouter
} from "../infrastructure/api/routes/buyer-routes";
import { PostgresAuthenticationRepository } from "../infrastructure/database/repositories/postgres-authentication-repository";
import { PostgresBillingAddressRepository } from "../infrastructure/database/repositories/postgres-billing-address-repository";
import { PostgresBuyerRepository } from "../infrastructure/database/repositories/postgres-buyer-repository";
import { PostgresCartRepository } from "../infrastructure/database/repositories/postgres-cart-repository";
import { PostgresEmailVerificationRepository } from "../infrastructure/database/repositories/postgres-email-verification-repository";
import { PostgresProductRepository } from "../infrastructure/database/repositories/postgres-product-repository";
import { PostgresWishlistRepository } from "../infrastructure/database/repositories/postgres-wishlist-repository";
import { createMailProvider } from "../infrastructure/notification/create-mail-provider";
import { JwtTokenVerifier } from "../infrastructure/security/jwt-token-verifier";
import { NumericVerificationCodeGenerator } from "../infrastructure/security/numeric-verification-code-generator";
import { ScryptPasswordHasher } from "../infrastructure/security/scrypt-password-hasher";
import { Router } from "express";

export function createBuyerModule() {
  const buyerRouter = Router();
  const authenticationRepository = new PostgresAuthenticationRepository();
  const billingAddressRepository = new PostgresBillingAddressRepository();
  const buyerRepository = new PostgresBuyerRepository();
  const cartRepository = new PostgresCartRepository();
  const emailVerificationRepository = new PostgresEmailVerificationRepository();
  const productRepository = new PostgresProductRepository();
  const wishlistRepository = new PostgresWishlistRepository();
  const passwordHasher = new ScryptPasswordHasher();
  const verificationCodeGenerator = new NumericVerificationCodeGenerator();
  const mailProvider = createMailProvider();
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
  const addBillingAddress = new AddBillingAddress(
    authenticationRepository,
    billingAddressRepository
  );
  const deleteBillingAddress = new DeleteBillingAddress(
    authenticationRepository,
    billingAddressRepository
  );
  const getBillingAddresses = new GetBillingAddresses(
    authenticationRepository,
    billingAddressRepository
  );
  const getBuyerWishlist = new GetBuyerWishlist(
    authenticationRepository,
    wishlistRepository,
    productRepository
  );
  const addProductToCart = new AddProductToCart(
    authenticationRepository,
    productRepository,
    cartRepository
  );
  const clearBuyerCart = new ClearBuyerCart(
    authenticationRepository,
    cartRepository
  );
  const getActiveCart = new GetActiveCart(
    authenticationRepository,
    cartRepository,
    productRepository
  );
  const removeProductFromCart = new RemoveProductFromCart(
    authenticationRepository,
    cartRepository
  );
  const updateProductQuantityInCart = new UpdateProductQuantityInCart(
    authenticationRepository,
    productRepository,
    cartRepository
  );
  const removeProductFromWishlist = new RemoveProductFromWishlist(
    authenticationRepository,
    wishlistRepository
  );
  const authenticateBuyer = createAuthMiddleware(tokenVerifier, "buyer");

  buyerRouter.use(createBuyerRouter({ registerBuyer }));
  buyerRouter.use(
    "/billing-addresses",
    authenticateBuyer,
    createProtectedBuyerBillingAddressRouter({
      addBillingAddress,
      deleteBillingAddress,
      getBillingAddresses
    })
  );
  buyerRouter.use(
    "/cart",
    authenticateBuyer,
    createProtectedBuyerCartRouter({
      clearBuyerCart,
      getActiveCart,
      addProductToCart,
      removeProductFromCart,
      updateProductQuantityInCart
    })
  );
  buyerRouter.use(
    "/wishlist",
    authenticateBuyer,
    createProtectedBuyerWishlistRouter({
      getBuyerWishlist,
      addProductToWishlist,
      removeProductFromWishlist
    })
  );

  return buyerRouter;
}
