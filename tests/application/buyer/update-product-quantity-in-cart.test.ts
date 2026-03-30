import { describe, expect, it, jest } from "@jest/globals";

import {
  UpdateProductQuantityInCart,
  UpdateProductQuantityInCartError
} from "../../../src/application/buyer/update-product-quantity-in-cart";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  CartItemRecord,
  CartRecord,
  CartRepository,
  CreateCartInput,
  CreateCartItemInput,
  UpdateCartItemQuantityInput
} from "../../../src/ports/cart-repository";
import type {
  CreateProductInput,
  ProductRecord,
  ProductRepository,
  UpdateProductStatusInput
} from "../../../src/ports/product-repository";

function makeApprovedProduct(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: "product-id",
    sellerId: "seller-id",
    categoryId: "category-id",
    brandId: "brand-id",
    brandName: "Apple",
    name: "Wireless Headset",
    description: "Noise-cancelling wireless headset",
    sku: "HEADSET-001",
    price: 85000,
    quantity: 10,
    currency: "NGN",
    condition: "new",
    weightKg: 0.4,
    status: "approved",
    reviewNote: null,
    reviewedAt: new Date("2026-03-30T00:00:00.000Z"),
    images: [],
    createdAt: new Date("2026-03-30T00:00:00.000Z"),
    updatedAt: new Date("2026-03-30T00:00:00.000Z"),
    ...overrides
  };
}

function makeActiveCart(overrides: Partial<CartRecord> = {}): CartRecord {
  return {
    id: "cart-id",
    buyerId: "buyer-id",
    status: "active",
    createdAt: new Date("2026-03-30T00:00:00.000Z"),
    updatedAt: new Date("2026-03-30T00:00:00.000Z"),
    ...overrides
  };
}

function makeCartItem(overrides: Partial<CartItemRecord> = {}): CartItemRecord {
  return {
    id: "cart-item-id",
    cartId: "cart-id",
    productId: "product-id",
    quantity: 2,
    createdAt: new Date("2026-03-30T00:00:00.000Z"),
    updatedAt: new Date("2026-03-30T00:00:00.000Z"),
    ...overrides
  };
}

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  findByEmail = jest
    .fn<(email: string) => Promise<AuthUser | null>>()
    .mockResolvedValue(null);

  findById = jest
    .fn<(userId: string) => Promise<AuthUser | null>>()
    .mockResolvedValue(makeBuyer());

  updatePassword = jest
    .fn<(input: { userId: string; passwordHash: string }) => Promise<void>>()
    .mockResolvedValue();
}

class ProductRepositoryDouble implements ProductRepository {
  create = jest
    .fn<(input: CreateProductInput) => Promise<ProductRecord>>()
    .mockResolvedValue(makeApprovedProduct());

  findById = jest
    .fn<(productId: string) => Promise<ProductRecord | null>>()
    .mockResolvedValue(makeApprovedProduct());

  findBySellerId = jest
    .fn<(sellerId: string) => Promise<ProductRecord[]>>()
    .mockResolvedValue([]);

  findPendingReview = jest.fn<() => Promise<ProductRecord[]>>().mockResolvedValue([]);

  updateStatus = jest
    .fn<(input: UpdateProductStatusInput) => Promise<ProductRecord | null>>()
    .mockResolvedValue(null);
}

class CartRepositoryDouble implements CartRepository {
  findActiveByBuyerId = jest
    .fn<(buyerId: string) => Promise<CartRecord | null>>()
    .mockResolvedValue(makeActiveCart());

  createCart = jest
    .fn<(input: CreateCartInput) => Promise<CartRecord>>()
    .mockResolvedValue(makeActiveCart());

  findItemsByCartId = jest
    .fn<(cartId: string) => Promise<CartItemRecord[]>>()
    .mockResolvedValue([]);

  clearItemsByCartId = jest
    .fn<(cartId: string) => Promise<number>>()
    .mockResolvedValue(0);

  findItemByCartIdAndProductId = jest
    .fn<(cartId: string, productId: string) => Promise<CartItemRecord | null>>()
    .mockResolvedValue(makeCartItem());

  createCartItem = jest
    .fn<(input: CreateCartItemInput) => Promise<CartItemRecord>>()
    .mockResolvedValue(makeCartItem());

  deleteCartItem = jest
    .fn<(cartItemId: string) => Promise<CartItemRecord | null>>()
    .mockResolvedValue(makeCartItem());

  updateCartItemQuantity = jest
    .fn<
      (input: UpdateCartItemQuantityInput) => Promise<CartItemRecord | null>
    >()
    .mockImplementation(async (input) =>
      makeCartItem({
        id: input.cartItemId,
        quantity: input.quantity
      })
    );
}

describe("UpdateProductQuantityInCart", () => {
  it("updates quantity for a product in the active cart", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const productRepository = new ProductRepositoryDouble();
    const cartRepository = new CartRepositoryDouble();
    const updateProductQuantityInCart = new UpdateProductQuantityInCart(
      authenticationRepository,
      productRepository,
      cartRepository
    );

    const result = await updateProductQuantityInCart.execute({
      buyerId: "buyer-id",
      productId: "product-id",
      quantity: 4
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("buyer-id");
    expect(cartRepository.findActiveByBuyerId).toHaveBeenCalledWith("buyer-id");
    expect(cartRepository.findItemByCartIdAndProductId).toHaveBeenCalledWith(
      "cart-id",
      "product-id"
    );
    expect(productRepository.findById).toHaveBeenCalledWith("product-id");
    expect(cartRepository.updateCartItemQuantity).toHaveBeenCalledWith({
      cartItemId: "cart-item-id",
      quantity: 4
    });
    expect(result).toMatchObject({
      cart: {
        id: "cart-id",
        status: "active"
      },
      item: {
        id: "cart-item-id",
        quantity: 4
      },
      unitPrice: 85000,
      subtotal: 340000,
      currency: "NGN"
    });
  });

  it("throws when the buyer account does not exist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue(null);
    const updateProductQuantityInCart = new UpdateProductQuantityInCart(
      authenticationRepository,
      new ProductRepositoryDouble(),
      new CartRepositoryDouble()
    );

    await expect(
      updateProductQuantityInCart.execute({
        buyerId: "missing-buyer-id",
        productId: "product-id",
        quantity: 3
      })
    ).rejects.toBeInstanceOf(UpdateProductQuantityInCartError);
  });

  it("throws when the authenticated user is not a buyer", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      ...makeBuyer(),
      role: "seller"
    });
    const updateProductQuantityInCart = new UpdateProductQuantityInCart(
      authenticationRepository,
      new ProductRepositoryDouble(),
      new CartRepositoryDouble()
    );

    await expect(
      updateProductQuantityInCart.execute({
        buyerId: "seller-id",
        productId: "product-id",
        quantity: 3
      })
    ).rejects.toBeInstanceOf(UpdateProductQuantityInCartError);
  });

  it("throws when quantity is not greater than zero", async () => {
    const updateProductQuantityInCart = new UpdateProductQuantityInCart(
      new AuthenticationRepositoryDouble(),
      new ProductRepositoryDouble(),
      new CartRepositoryDouble()
    );

    await expect(
      updateProductQuantityInCart.execute({
        buyerId: "buyer-id",
        productId: "product-id",
        quantity: 0
      })
    ).rejects.toBeInstanceOf(UpdateProductQuantityInCartError);
  });

  it("throws when the buyer has no active cart", async () => {
    const cartRepository = new CartRepositoryDouble();
    cartRepository.findActiveByBuyerId.mockResolvedValue(null);
    const updateProductQuantityInCart = new UpdateProductQuantityInCart(
      new AuthenticationRepositoryDouble(),
      new ProductRepositoryDouble(),
      cartRepository
    );

    await expect(
      updateProductQuantityInCart.execute({
        buyerId: "buyer-id",
        productId: "product-id",
        quantity: 3
      })
    ).rejects.toBeInstanceOf(UpdateProductQuantityInCartError);
  });

  it("throws when the product is not in the active cart", async () => {
    const cartRepository = new CartRepositoryDouble();
    cartRepository.findItemByCartIdAndProductId.mockResolvedValue(null);
    const updateProductQuantityInCart = new UpdateProductQuantityInCart(
      new AuthenticationRepositoryDouble(),
      new ProductRepositoryDouble(),
      cartRepository
    );

    await expect(
      updateProductQuantityInCart.execute({
        buyerId: "buyer-id",
        productId: "missing-product-id",
        quantity: 3
      })
    ).rejects.toBeInstanceOf(UpdateProductQuantityInCartError);
  });

  it("throws when the product no longer exists", async () => {
    const productRepository = new ProductRepositoryDouble();
    productRepository.findById.mockResolvedValue(null);
    const updateProductQuantityInCart = new UpdateProductQuantityInCart(
      new AuthenticationRepositoryDouble(),
      productRepository,
      new CartRepositoryDouble()
    );

    await expect(
      updateProductQuantityInCart.execute({
        buyerId: "buyer-id",
        productId: "missing-product-id",
        quantity: 3
      })
    ).rejects.toBeInstanceOf(UpdateProductQuantityInCartError);
  });

  it("throws when the product is no longer approved", async () => {
    const productRepository = new ProductRepositoryDouble();
    productRepository.findById.mockResolvedValue(
      makeApprovedProduct({
        status: "rejected"
      })
    );
    const updateProductQuantityInCart = new UpdateProductQuantityInCart(
      new AuthenticationRepositoryDouble(),
      productRepository,
      new CartRepositoryDouble()
    );

    await expect(
      updateProductQuantityInCart.execute({
        buyerId: "buyer-id",
        productId: "product-id",
        quantity: 3
      })
    ).rejects.toBeInstanceOf(UpdateProductQuantityInCartError);
  });

  it("throws when the product is out of stock", async () => {
    const productRepository = new ProductRepositoryDouble();
    productRepository.findById.mockResolvedValue(
      makeApprovedProduct({
        quantity: 0
      })
    );
    const updateProductQuantityInCart = new UpdateProductQuantityInCart(
      new AuthenticationRepositoryDouble(),
      productRepository,
      new CartRepositoryDouble()
    );

    await expect(
      updateProductQuantityInCart.execute({
        buyerId: "buyer-id",
        productId: "product-id",
        quantity: 1
      })
    ).rejects.toBeInstanceOf(UpdateProductQuantityInCartError);
  });

  it("throws when the requested quantity exceeds available stock", async () => {
    const updateProductQuantityInCart = new UpdateProductQuantityInCart(
      new AuthenticationRepositoryDouble(),
      new ProductRepositoryDouble(),
      new CartRepositoryDouble()
    );

    await expect(
      updateProductQuantityInCart.execute({
        buyerId: "buyer-id",
        productId: "product-id",
        quantity: 20
      })
    ).rejects.toBeInstanceOf(UpdateProductQuantityInCartError);
  });

  it("throws when the quantity update unexpectedly fails", async () => {
    const cartRepository = new CartRepositoryDouble();
    cartRepository.updateCartItemQuantity.mockResolvedValue(null);
    const updateProductQuantityInCart = new UpdateProductQuantityInCart(
      new AuthenticationRepositoryDouble(),
      new ProductRepositoryDouble(),
      cartRepository
    );

    await expect(
      updateProductQuantityInCart.execute({
        buyerId: "buyer-id",
        productId: "product-id",
        quantity: 3
      })
    ).rejects.toBeInstanceOf(UpdateProductQuantityInCartError);
  });
});

function makeBuyer(): AuthUser {
  return {
    id: "buyer-id",
    firstName: "John",
    lastName: "Doe",
    username: "john.doe",
    email: "john@example.com",
    phone: "+2348012345678",
    passwordHash: "hashed-password",
    role: "buyer",
    accountStatus: "verified",
    createdAt: new Date("2026-03-30T00:00:00.000Z"),
    updatedAt: new Date("2026-03-30T00:00:00.000Z")
  };
}
