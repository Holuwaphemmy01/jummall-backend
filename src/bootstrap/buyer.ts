import { AddProductToCart } from "../application/buyer/add-product-to-cart";
import { AddBillingAddress } from "../application/buyer/add-billing-address";
import { AddProductToWishlist } from "../application/buyer/add-product-to-wishlist";
import { GetBuyerOrderDetail } from "../application/buyer/get-buyer-order-detail";
import { ListBuyerOrders } from "../application/buyer/list-buyer-orders";
import { CompleteCheckoutAfterPayment } from "../application/checkout/complete-checkout-after-payment";
import { GetCheckoutStatus } from "../application/checkout/get-checkout-status";
import { GetOrderSummary } from "../application/checkout/get-order-summary";
import { InitializeCheckout } from "../application/checkout/initialize-checkout";
import { PrepareCheckoutData } from "../application/checkout/prepare-checkout-data";
import { CalculateCartShipping } from "../application/shipping/calculate-cart-shipping";
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
  createProtectedBuyerOrderRouter,
  createProtectedBuyerWishlistRouter
} from "../infrastructure/api/routes/buyer-routes";
import { PostgresAuthenticationRepository } from "../infrastructure/database/repositories/postgres-authentication-repository";
import { PostgresBillingAddressRepository } from "../infrastructure/database/repositories/postgres-billing-address-repository";
import { PostgresCategoryShippingRuleRepository } from "../infrastructure/database/repositories/postgres-category-shipping-rule-repository";
import { PostgresBuyerRepository } from "../infrastructure/database/repositories/postgres-buyer-repository";
import { PostgresCartRepository } from "../infrastructure/database/repositories/postgres-cart-repository";
import { PostgresCheckoutSessionRepository } from "../infrastructure/database/repositories/postgres-checkout-session-repository";
import { PostgresCheckoutTransactionRunner } from "../infrastructure/database/repositories/postgres-checkout-transaction-runner";
import { PostgresEmailVerificationRepository } from "../infrastructure/database/repositories/postgres-email-verification-repository";
import { PostgresFreeShippingRuleRepository } from "../infrastructure/database/repositories/postgres-free-shipping-rule-repository";
import { PostgresOrderRepository } from "../infrastructure/database/repositories/postgres-order-repository";
import { PostgresProductRepository } from "../infrastructure/database/repositories/postgres-product-repository";
import { PostgresShippingSettingsRepository } from "../infrastructure/database/repositories/postgres-shipping-settings-repository";
import { PostgresShippingZoneRepository } from "../infrastructure/database/repositories/postgres-shipping-zone-repository";
import { PostgresShippingZoneRuleRepository } from "../infrastructure/database/repositories/postgres-shipping-zone-rule-repository";
import { PostgresWishlistRepository } from "../infrastructure/database/repositories/postgres-wishlist-repository";
import { createMailProvider } from "../infrastructure/notification/create-mail-provider";
import { PaystackPaymentProvider } from "../infrastructure/payment/paystack-payment-provider";
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
  const checkoutSessionRepository = new PostgresCheckoutSessionRepository();
  const checkoutTransactionRunner = new PostgresCheckoutTransactionRunner();
  const categoryShippingRuleRepository = new PostgresCategoryShippingRuleRepository();
  const emailVerificationRepository = new PostgresEmailVerificationRepository();
  const freeShippingRuleRepository = new PostgresFreeShippingRuleRepository();
  const orderRepository = new PostgresOrderRepository();
  const productRepository = new PostgresProductRepository();
  const shippingSettingsRepository = new PostgresShippingSettingsRepository();
  const shippingZoneRepository = new PostgresShippingZoneRepository();
  const shippingZoneRuleRepository = new PostgresShippingZoneRuleRepository();
  const wishlistRepository = new PostgresWishlistRepository();
  const passwordHasher = new ScryptPasswordHasher();
  const verificationCodeGenerator = new NumericVerificationCodeGenerator();
  const mailProvider = createMailProvider();
  const paymentProvider = new PaystackPaymentProvider();
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
  const listBuyerOrders = new ListBuyerOrders(
    authenticationRepository,
    orderRepository
  );
  const getBuyerOrderDetail = new GetBuyerOrderDetail(
    authenticationRepository,
    orderRepository
  );
  const addProductToCart = new AddProductToCart(
    authenticationRepository,
    productRepository,
    cartRepository,
    checkoutSessionRepository
  );
  const clearBuyerCart = new ClearBuyerCart(
    authenticationRepository,
    cartRepository,
    checkoutSessionRepository
  );
  const getActiveCart = new GetActiveCart(
    authenticationRepository,
    cartRepository,
    productRepository
  );
  const calculateCartShipping = new CalculateCartShipping(
    authenticationRepository,
    billingAddressRepository,
    cartRepository,
    productRepository,
    shippingSettingsRepository,
    shippingZoneRepository,
    shippingZoneRuleRepository,
    categoryShippingRuleRepository,
    freeShippingRuleRepository
  );
  const removeProductFromCart = new RemoveProductFromCart(
    authenticationRepository,
    cartRepository,
    checkoutSessionRepository
  );
  const updateProductQuantityInCart = new UpdateProductQuantityInCart(
    authenticationRepository,
    productRepository,
    cartRepository,
    checkoutSessionRepository
  );
  const prepareCheckoutData = new PrepareCheckoutData(
    authenticationRepository,
    billingAddressRepository,
    cartRepository,
    productRepository,
    calculateCartShipping
  );
  const getOrderSummary = new GetOrderSummary(prepareCheckoutData);
  const initializeCheckout = new InitializeCheckout(
    prepareCheckoutData,
    checkoutSessionRepository,
    paymentProvider
  );
  const completeCheckoutAfterPayment = new CompleteCheckoutAfterPayment(
    checkoutSessionRepository,
    checkoutTransactionRunner
  );
  const getCheckoutStatus = new GetCheckoutStatus(
    authenticationRepository,
    checkoutSessionRepository,
    paymentProvider,
    completeCheckoutAfterPayment
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
      calculateCartShipping,
      getOrderSummary,
      initializeCheckout,
      getCheckoutStatus,
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
  buyerRouter.use(
    "/orders",
    authenticateBuyer,
    createProtectedBuyerOrderRouter({
      listBuyerOrders,
      getBuyerOrderDetail
    })
  );

  return buyerRouter;
}
