import { Router } from "express";

import type { AddProductToCartUseCase } from "../../../application/buyer/add-product-to-cart";
import type { AddBillingAddressUseCase } from "../../../application/buyer/add-billing-address";
import { AddBillingAddressError } from "../../../application/buyer/add-billing-address";
import { AddProductToCartError } from "../../../application/buyer/add-product-to-cart";
import type { CalculateCartShippingUseCase } from "../../../application/shipping/calculate-cart-shipping";
import { CalculateCartShippingError } from "../../../application/shipping/calculate-cart-shipping";
import type { ClearBuyerCartUseCase } from "../../../application/buyer/clear-buyer-cart";
import { ClearBuyerCartError } from "../../../application/buyer/clear-buyer-cart";
import type { GetActiveCartUseCase } from "../../../application/buyer/get-active-cart";
import { GetActiveCartError } from "../../../application/buyer/get-active-cart";
import type { RemoveProductFromCartUseCase } from "../../../application/buyer/remove-product-from-cart";
import { RemoveProductFromCartError } from "../../../application/buyer/remove-product-from-cart";
import type { UpdateProductQuantityInCartUseCase } from "../../../application/buyer/update-product-quantity-in-cart";
import { UpdateProductQuantityInCartError } from "../../../application/buyer/update-product-quantity-in-cart";
import type { AddProductToWishlistUseCase } from "../../../application/buyer/add-product-to-wishlist";
import { AddProductToWishlistError } from "../../../application/buyer/add-product-to-wishlist";
import type { GetCheckoutStatusUseCase } from "../../../application/checkout/get-checkout-status";
import { GetCheckoutStatusError } from "../../../application/checkout/get-checkout-status";
import type { GetOrderSummaryUseCase } from "../../../application/checkout/get-order-summary";
import { GetOrderSummaryError } from "../../../application/checkout/get-order-summary";
import type { InitializeCheckoutUseCase } from "../../../application/checkout/initialize-checkout";
import { InitializeCheckoutError } from "../../../application/checkout/initialize-checkout";
import type { DeleteBillingAddressUseCase } from "../../../application/buyer/delete-billing-address";
import { DeleteBillingAddressError } from "../../../application/buyer/delete-billing-address";
import type { GetBillingAddressesUseCase } from "../../../application/buyer/get-billing-addresses";
import { GetBillingAddressesError } from "../../../application/buyer/get-billing-addresses";
import type { GetBuyerWishlistUseCase } from "../../../application/buyer/get-buyer-wishlist";
import { GetBuyerWishlistError } from "../../../application/buyer/get-buyer-wishlist";
import type { RemoveProductFromWishlistUseCase } from "../../../application/buyer/remove-product-from-wishlist";
import { RemoveProductFromWishlistError } from "../../../application/buyer/remove-product-from-wishlist";
import type { RegisterBuyerUseCase } from "../../../application/buyer/register-buyer";
import { RegisterBuyerError } from "../../../application/buyer/register-buyer";
import { toProductImageResponse } from "../responses/product-image-response";
import { addProductToCartSchema } from "../validation/add-product-to-cart-schema";
import type { AuthenticatedUser } from "../middleware/create-auth-middleware";
import { addBillingAddressSchema } from "../validation/add-billing-address-schema";
import { addProductToWishlistSchema } from "../validation/add-product-to-wishlist-schema";
import { calculateCartShippingSchema } from "../validation/calculate-cart-shipping-schema";
import { registerBuyerSchema } from "../validation/register-buyer-schema";
import { updateProductQuantityInCartSchema } from "../validation/update-product-quantity-in-cart-schema";

interface BuyerRouterDependencies {
  registerBuyer: RegisterBuyerUseCase;
}

interface BuyerWishlistRouterDependencies {
  getBuyerWishlist: GetBuyerWishlistUseCase;
  addProductToWishlist: AddProductToWishlistUseCase;
  removeProductFromWishlist: RemoveProductFromWishlistUseCase;
}

interface BuyerBillingAddressRouterDependencies {
  addBillingAddress: AddBillingAddressUseCase;
  deleteBillingAddress: DeleteBillingAddressUseCase;
  getBillingAddresses: GetBillingAddressesUseCase;
}

interface BuyerCartRouterDependencies {
  clearBuyerCart: ClearBuyerCartUseCase;
  getActiveCart: GetActiveCartUseCase;
  addProductToCart: AddProductToCartUseCase;
  calculateCartShipping: CalculateCartShippingUseCase;
  getOrderSummary?: GetOrderSummaryUseCase;
  initializeCheckout?: InitializeCheckoutUseCase;
  getCheckoutStatus?: GetCheckoutStatusUseCase;
  removeProductFromCart: RemoveProductFromCartUseCase;
  updateProductQuantityInCart: UpdateProductQuantityInCartUseCase;
}

function toCheckoutSummaryResponse(
  summary: Awaited<ReturnType<GetOrderSummaryUseCase["execute"]>>["summary"]
) {
  return {
    cart_id: summary.cartId,
    billing_address: {
      id: summary.billingAddress.id,
      full_name: summary.billingAddress.fullName,
      phone_number: summary.billingAddress.phoneNumber,
      address_line_1: summary.billingAddress.addressLine1,
      address_line_2: summary.billingAddress.addressLine2,
      city: summary.billingAddress.city,
      state: summary.billingAddress.state,
      country: summary.billingAddress.country,
      postal_code: summary.billingAddress.postalCode
    },
    items: summary.items.map((item) => ({
      cart_item_id: item.cartItemId,
      product_id: item.productId,
      seller_id: item.sellerId,
      category_id: item.categoryId,
      category_name: item.categoryName,
      brand_id: item.brandId,
      brand_name: item.brandName,
      name: item.name,
      description: item.description,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_subtotal: item.lineSubtotal,
      currency: item.currency,
      condition: item.condition,
      weight_kg: item.weightKg,
      images: item.images.map((image) => toProductImageResponse(image))
    })),
    currency: summary.currency,
    total_items: summary.totalItems,
    raw_subtotal: summary.rawSubtotal,
    discounted_subtotal: summary.discountedSubtotal,
    shipping_mode: summary.shippingMode,
    category_shipping_mode: summary.categoryShippingMode,
    base_shipping_fee: summary.baseShippingFee,
    final_shipping_fee: summary.finalShippingFee,
    total_payable: summary.totalPayable,
    free_shipping: {
      applied: summary.freeShipping.applied,
      rule_id: summary.freeShipping.ruleId,
      rule_type: summary.freeShipping.ruleType,
      coupon_code: summary.freeShipping.couponCode
    },
    shipping_breakdown: summary.shippingBreakdown.map((segment) => ({
      seller_id: segment.sellerId,
      rule_owner_type: segment.ruleOwnerType,
      final_shipping_owner_type: segment.finalShippingOwnerType,
      used_fallback: segment.usedFallback,
      matched_zone: {
        id: segment.matchedZone.id,
        name: segment.matchedZone.name,
        match_type: segment.matchedZone.matchType
      },
      zone_fee: segment.zoneFee,
      category_fee: segment.categoryFee,
      base_shipping_fee: segment.baseShippingFee,
      final_shipping_fee: segment.finalShippingFee
    }))
  };
}

export default function createBuyerRouter({
  registerBuyer
}: BuyerRouterDependencies) {
  const buyerRouter = Router();

  buyerRouter.post("/register", async (req, res) => {
    const { error, value } = registerBuyerSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message
        }))
      });
    }

    try {
      const buyer = await registerBuyer.execute({
        firstName: value.first_name,
        lastName: value.last_name,
        username: value.username,
        email: value.email,
        password: value.password,
        phone: value.phone,
        passwordConfirmation: value.password_confirmation
      });

      return res.status(201).json({
        message: "Buyer registered successfully.",
        data: {
          id: buyer.id,
          first_name: buyer.firstName,
          last_name: buyer.lastName,
          username: buyer.username,
          email: buyer.email,
          phone: buyer.phone,
          role: buyer.role,
          account_status: buyer.accountStatus,
          created_at: buyer.createdAt.toISOString(),
          updated_at: buyer.updatedAt.toISOString()
        }
      });
    } catch (error) {
      if (error instanceof RegisterBuyerError) {
        return res.status(error.statusCode).json({
          message: error.message,
          field: error.field
        });
      }

      return res.status(500).json({
        message: "Unable to register buyer."
      });
    }
  });

  return buyerRouter;
}

export function createProtectedBuyerWishlistRouter({
  getBuyerWishlist,
  addProductToWishlist,
  removeProductFromWishlist
}: BuyerWishlistRouterDependencies) {
  const buyerWishlistRouter = Router();

  buyerWishlistRouter.get("/", async (_req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const result = await getBuyerWishlist.execute({
        buyerId: authUser.sub
      });

      return res.status(200).json({
        message: "Buyer wishlist fetched successfully.",
        data: {
          items: result.items.map((item) => ({
            id: item.id,
            buyer_id: item.buyerId,
            product_id: item.productId,
            product: {
              id: item.product.id,
              name: item.product.name,
              description: item.product.description,
              brand_id: item.product.brandId,
              brand_name: item.product.brandName,
              category_id: item.product.categoryId,
              sku: item.product.sku,
              price: item.product.price,
              currency: item.product.currency,
              condition: item.product.condition,
              weight_kg: item.product.weightKg,
              status: item.product.status,
              available_quantity: item.product.availableQuantity,
              images: item.product.images.map((image) =>
                toProductImageResponse(image)
              )
            },
            created_at: item.createdAt.toISOString(),
            updated_at: item.updatedAt.toISOString()
          }))
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof GetBuyerWishlistError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to fetch buyer wishlist."
      });
    }
  });

  buyerWishlistRouter.post("/", async (req, res) => {
    const { error, value } = addProductToWishlistSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message
        }))
      });
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const wishlistItem = await addProductToWishlist.execute({
        buyerId: authUser.sub,
        productId: value.product_id
      });

      return res.status(201).json({
        message: "Product added to wishlist successfully.",
        data: {
          id: wishlistItem.id,
          buyer_id: wishlistItem.buyerId,
          product_id: wishlistItem.productId,
          created_at: wishlistItem.createdAt.toISOString(),
          updated_at: wishlistItem.updatedAt.toISOString()
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof AddProductToWishlistError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to add product to wishlist."
      });
    }
  });

  buyerWishlistRouter.delete("/:productId", async (req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      await removeProductFromWishlist.execute({
        buyerId: authUser.sub,
        productId: req.params.productId
      });

      return res.status(200).json({
        message: "Product removed from wishlist successfully."
      });
    } catch (caughtError) {
      if (caughtError instanceof RemoveProductFromWishlistError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to remove product from wishlist."
      });
    }
  });

  return buyerWishlistRouter;
}

export function createProtectedBuyerBillingAddressRouter({
  addBillingAddress,
  deleteBillingAddress,
  getBillingAddresses
}: BuyerBillingAddressRouterDependencies) {
  const buyerBillingAddressRouter = Router();

  buyerBillingAddressRouter.get("/", async (_req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const result = await getBillingAddresses.execute({
        buyerId: authUser.sub
      });

      return res.status(200).json({
        message: "Billing addresses fetched successfully.",
        data: result.addresses.map((billingAddress) => ({
          id: billingAddress.id,
          buyer_id: billingAddress.buyerId,
          full_name: billingAddress.fullName,
          phone_number: billingAddress.phoneNumber,
          address_line_1: billingAddress.addressLine1,
          address_line_2: billingAddress.addressLine2,
          city: billingAddress.city,
          state: billingAddress.state,
          country: billingAddress.country,
          postal_code: billingAddress.postalCode,
          created_at: billingAddress.createdAt.toISOString(),
          updated_at: billingAddress.updatedAt.toISOString()
        }))
      });
    } catch (caughtError) {
      if (caughtError instanceof GetBillingAddressesError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to fetch billing addresses."
      });
    }
  });

  buyerBillingAddressRouter.post("/", async (req, res) => {
    const { error, value } = addBillingAddressSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message
        }))
      });
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const billingAddress = await addBillingAddress.execute({
        buyerId: authUser.sub,
        fullName: value.full_name,
        phoneNumber: value.phone_number,
        addressLine1: value.address_line_1,
        addressLine2: value.address_line_2 ?? undefined,
        city: value.city,
        state: value.state,
        country: value.country,
        postalCode: value.postal_code ?? undefined
      });

      return res.status(201).json({
        message: "Billing address added successfully.",
        data: {
          id: billingAddress.id,
          buyer_id: billingAddress.buyerId,
          full_name: billingAddress.fullName,
          phone_number: billingAddress.phoneNumber,
          address_line_1: billingAddress.addressLine1,
          address_line_2: billingAddress.addressLine2,
          city: billingAddress.city,
          state: billingAddress.state,
          country: billingAddress.country,
          postal_code: billingAddress.postalCode,
          created_at: billingAddress.createdAt.toISOString(),
          updated_at: billingAddress.updatedAt.toISOString()
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof AddBillingAddressError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to add billing address."
      });
    }
  });

  buyerBillingAddressRouter.delete("/:billingAddressId", async (req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      await deleteBillingAddress.execute({
        buyerId: authUser.sub,
        billingAddressId: req.params.billingAddressId
      });

      return res.status(200).json({
        message: "Billing address deleted successfully."
      });
    } catch (caughtError) {
      if (caughtError instanceof DeleteBillingAddressError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to delete billing address."
      });
    }
  });

  return buyerBillingAddressRouter;
}

export function createProtectedBuyerCartRouter({
  clearBuyerCart,
  getActiveCart,
  addProductToCart,
  calculateCartShipping,
  getOrderSummary,
  initializeCheckout,
  getCheckoutStatus,
  removeProductFromCart,
  updateProductQuantityInCart
}: BuyerCartRouterDependencies) {
  const buyerCartRouter = Router();

  buyerCartRouter.get("/", async (_req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const result = await getActiveCart.execute({
        buyerId: authUser.sub
      });

      return res.status(200).json({
        message: "Buyer cart fetched successfully.",
        data: {
          cart_id: result.cart?.id ?? null,
          cart_status: result.cart?.status ?? null,
          items: result.items.map((item) => ({
            id: item.id,
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            subtotal: item.subtotal,
            currency: item.currency,
            product: {
              id: item.product.id,
              name: item.product.name,
              description: item.product.description,
              brand_id: item.product.brandId,
              brand_name: item.product.brandName,
              category_id: item.product.categoryId,
              sku: item.product.sku,
              condition: item.product.condition,
              weight_kg: item.product.weightKg,
              status: item.product.status,
              available_quantity: item.product.availableQuantity,
              images: item.product.images.map((image) =>
                toProductImageResponse(image)
              )
            },
            created_at: item.createdAt.toISOString(),
            updated_at: item.updatedAt.toISOString()
          })),
          summary: {
            total_items: result.totalItems,
            subtotal: result.subtotal,
            currency: result.currency
          }
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof GetActiveCartError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to fetch buyer cart."
      });
    }
  });

  buyerCartRouter.post("/", async (req, res) => {
    const { error, value } = addProductToCartSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message
        }))
      });
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const result = await addProductToCart.execute({
        buyerId: authUser.sub,
        productId: value.product_id,
        quantity: value.quantity
      });

      return res.status(200).json({
        message: "Product added to cart successfully.",
        data: {
          cart_id: result.cart.id,
          cart_status: result.cart.status,
          item: {
            id: result.item.id,
            product_id: result.item.productId,
            quantity: result.item.quantity,
            created_at: result.item.createdAt.toISOString(),
            updated_at: result.item.updatedAt.toISOString()
          },
          pricing: {
            unit_price: result.unitPrice,
            subtotal: result.subtotal,
            currency: result.currency
          }
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof AddProductToCartError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to add product to cart."
      });
    }
  });

  buyerCartRouter.post("/shipping-preview", async (req, res) => {
    const { error, value } = calculateCartShippingSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message
        }))
      });
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const result = await calculateCartShipping.execute({
        buyerId: authUser.sub,
        billingAddressId: value.billing_address_id,
        discountedSubtotal: value.discounted_subtotal,
        freeShippingCouponCode: value.free_shipping_coupon_code ?? undefined
      });

      return res.status(200).json({
        message: "Shipping preview calculated successfully.",
        data: {
          cart_id: result.cartId,
          currency: result.currency,
          raw_subtotal: result.rawSubtotal,
          discounted_subtotal: result.discountedSubtotal,
          total_items: result.totalItems,
          shipping_mode: result.shippingMode,
          category_shipping_mode: result.categoryShippingMode,
          base_shipping_fee: result.baseShippingFee,
          final_shipping_fee: result.finalShippingFee,
          free_shipping: {
            applied: result.freeShipping.applied,
            rule_id: result.freeShipping.ruleId,
            rule_type: result.freeShipping.ruleType,
            coupon_code: result.freeShipping.couponCode
          },
          breakdown: result.breakdown.map((segment) => ({
            seller_id: segment.sellerId,
            rule_owner_type: segment.ruleOwnerType,
            final_shipping_owner_type: segment.finalShippingOwnerType,
            used_fallback: segment.usedFallback,
            matched_zone: {
              id: segment.matchedZone.id,
              name: segment.matchedZone.name,
              match_type: segment.matchedZone.matchType
            },
            zone_fee: segment.zoneFee,
            category_fee: segment.categoryFee,
            base_shipping_fee: segment.baseShippingFee,
            final_shipping_fee: segment.finalShippingFee
          }))
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof CalculateCartShippingError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to calculate shipping preview."
      });
    }
  });

  buyerCartRouter.post("/order-summary", async (req, res) => {
    const { error, value } = calculateCartShippingSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message
        }))
      });
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const result = await getOrderSummary!.execute({
        buyerId: authUser.sub,
        billingAddressId: value.billing_address_id,
        discountedSubtotal: value.discounted_subtotal,
        freeShippingCouponCode: value.free_shipping_coupon_code ?? undefined
      });

      return res.status(200).json({
        message: "Order summary generated successfully.",
        data: toCheckoutSummaryResponse(result.summary)
      });
    } catch (caughtError) {
      if (caughtError instanceof GetOrderSummaryError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to generate order summary."
      });
    }
  });

  buyerCartRouter.post("/checkout/initialize", async (req, res) => {
    const { error, value } = calculateCartShippingSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message
        }))
      });
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const result = await initializeCheckout!.execute({
        buyerId: authUser.sub,
        billingAddressId: value.billing_address_id,
        discountedSubtotal: value.discounted_subtotal,
        freeShippingCouponCode: value.free_shipping_coupon_code ?? undefined
      });

      return res.status(200).json({
        message: "Checkout initialized successfully.",
        data: {
          checkout_reference: result.checkoutReference,
          authorization_url: result.authorizationUrl,
          access_code: result.accessCode,
          ...toCheckoutSummaryResponse(result.summary)
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof InitializeCheckoutError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to initialize checkout."
      });
    }
  });

  buyerCartRouter.get("/checkout/:reference", async (req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const result = await getCheckoutStatus!.execute({
        buyerId: authUser.sub,
        reference: req.params.reference
      });

      return res.status(200).json({
        message: "Checkout status fetched successfully.",
        data: {
          checkout_reference: result.checkoutReference,
          status: result.status,
          payment_provider: result.paymentProvider,
          payment_reference: result.paymentReference,
          order_id: result.orderId,
          failure_reason: result.failureReason
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof GetCheckoutStatusError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to fetch checkout status."
      });
    }
  });

  buyerCartRouter.delete("/clear-cart", async (_req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const result = await clearBuyerCart.execute({
        buyerId: authUser.sub
      });

      return res.status(200).json({
        message: "Cart cleared successfully.",
        data: {
          cart_id: result.cartId,
          cart_status: result.cartStatus,
          cleared_items_count: result.clearedItemsCount
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof ClearBuyerCartError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to clear cart."
      });
    }
  });

  buyerCartRouter.delete("/:productId", async (req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      await removeProductFromCart.execute({
        buyerId: authUser.sub,
        productId: req.params.productId
      });

      return res.status(200).json({
        message: "Product removed from cart successfully."
      });
    } catch (caughtError) {
      if (caughtError instanceof RemoveProductFromCartError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to remove product from cart."
      });
    }
  });

  buyerCartRouter.patch("/:productId", async (req, res) => {
    const { error, value } = updateProductQuantityInCartSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message
        }))
      });
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const result = await updateProductQuantityInCart.execute({
        buyerId: authUser.sub,
        productId: req.params.productId,
        quantity: value.quantity
      });

      return res.status(200).json({
        message: "Cart quantity updated successfully.",
        data: {
          cart_id: result.cart.id,
          cart_status: result.cart.status,
          item: {
            id: result.item.id,
            product_id: result.item.productId,
            quantity: result.item.quantity,
            created_at: result.item.createdAt.toISOString(),
            updated_at: result.item.updatedAt.toISOString()
          },
          pricing: {
            unit_price: result.unitPrice,
            subtotal: result.subtotal,
            currency: result.currency
          }
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof UpdateProductQuantityInCartError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to update cart quantity."
      });
    }
  });

  return buyerCartRouter;
}
