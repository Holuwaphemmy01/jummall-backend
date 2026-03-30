import { Router } from "express";

import type { AddProductToCartUseCase } from "../../../application/buyer/add-product-to-cart";
import { AddProductToCartError } from "../../../application/buyer/add-product-to-cart";
import type { RemoveProductFromCartUseCase } from "../../../application/buyer/remove-product-from-cart";
import { RemoveProductFromCartError } from "../../../application/buyer/remove-product-from-cart";
import type { AddProductToWishlistUseCase } from "../../../application/buyer/add-product-to-wishlist";
import { AddProductToWishlistError } from "../../../application/buyer/add-product-to-wishlist";
import type { RemoveProductFromWishlistUseCase } from "../../../application/buyer/remove-product-from-wishlist";
import { RemoveProductFromWishlistError } from "../../../application/buyer/remove-product-from-wishlist";
import type { RegisterBuyerUseCase } from "../../../application/buyer/register-buyer";
import { RegisterBuyerError } from "../../../application/buyer/register-buyer";
import { addProductToCartSchema } from "../validation/add-product-to-cart-schema";
import type { AuthenticatedUser } from "../middleware/create-auth-middleware";
import { addProductToWishlistSchema } from "../validation/add-product-to-wishlist-schema";
import { registerBuyerSchema } from "../validation/register-buyer-schema";

interface BuyerRouterDependencies {
  registerBuyer: RegisterBuyerUseCase;
}

interface BuyerWishlistRouterDependencies {
  addProductToWishlist: AddProductToWishlistUseCase;
  removeProductFromWishlist: RemoveProductFromWishlistUseCase;
}

interface BuyerCartRouterDependencies {
  addProductToCart: AddProductToCartUseCase;
  removeProductFromCart: RemoveProductFromCartUseCase;
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
  addProductToWishlist,
  removeProductFromWishlist
}: BuyerWishlistRouterDependencies) {
  const buyerWishlistRouter = Router();

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

export function createProtectedBuyerCartRouter({
  addProductToCart,
  removeProductFromCart
}: BuyerCartRouterDependencies) {
  const buyerCartRouter = Router();

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

  return buyerCartRouter;
}
