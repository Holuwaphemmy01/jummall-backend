import { describe, expect, it, jest } from "@jest/globals";

import {
  AddProductToCart,
  AddProductToCartError
} from "../../../src/application/buyer/add-product-to-cart";
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
    reviewedAt: new Date("2026-03-29T00:00:00.000Z"),
    images: [],
    createdAt: new Date("2026-03-29T00:00:00.000Z"),
    updatedAt: new Date("2026-03-29T00:00:00.000Z"),
    ...overrides
  };
}

function makeActiveCart(overrides: Partial<CartRecord> = {}): CartRecord {
  return {
    id: "cart-id",
    buyerId: "buyer-id",
    status: "active",
    createdAt: new Date("2026-03-29T00:00:00.000Z"),
    updatedAt: new Date("2026-03-29T00:00:00.000Z"),
    ...overrides
  };
}

function makeCartItem(overrides: Partial<CartItemRecord> = {}): CartItemRecord {
  return {
    id: "cart-item-id",
    cartId: "cart-id",
    productId: "product-id",
    quantity: 2,
    createdAt: new Date("2026-03-29T00:00:00.000Z"),
    updatedAt: new Date("2026-03-29T00:00:00.000Z"),
    ...overrides
  };
}

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  findByEmail = jest
    .fn<(email: string) => Promise<AuthUser | null>>()
    .mockResolvedValue(null);

  findById = jest
    .fn<(userId: string) => Promise<AuthUser | null>>()
    .mockResolvedValue({
      id: "buyer-id",
      firstName: "John",
      lastName: "Doe",
      username: "john.doe",
      email: "john@example.com",
      phone: "+2348012345678",
      passwordHash: "hashed-password",
      role: "buyer",
      accountStatus: "verified",
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z")
    });

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
    .mockResolvedValue(null);

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
    .mockResolvedValue(null);

  createCartItem = jest
    .fn<(input: CreateCartItemInput) => Promise<CartItemRecord>>()
    .mockImplementation(async (input) =>
      makeCartItem({
        cartId: input.cartId,
        productId: input.productId,
        quantity: input.quantity
      })
    );

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

describe("AddProductToCart", () => {
  it("creates an active cart and adds a new cart item", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const productRepository = new ProductRepositoryDouble();
    const cartRepository = new CartRepositoryDouble();
    const addProductToCart = new AddProductToCart(
      authenticationRepository,
      productRepository,
      cartRepository
    );

    const result = await addProductToCart.execute({
      buyerId: "buyer-id",
      productId: "product-id",
      quantity: 2
    });

    expect(authenticationRepository.findById).toHaveBeenCalledWith("buyer-id");
    expect(productRepository.findById).toHaveBeenCalledWith("product-id");
    expect(cartRepository.findActiveByBuyerId).toHaveBeenCalledWith("buyer-id");
    expect(cartRepository.createCart).toHaveBeenCalledWith({
      buyerId: "buyer-id"
    });
    expect(cartRepository.createCartItem).toHaveBeenCalledWith({
      cartId: "cart-id",
      productId: "product-id",
      quantity: 2
    });
    expect(result).toMatchObject({
      cart: {
        id: "cart-id",
        status: "active"
      },
      item: {
        productId: "product-id",
        quantity: 2
      },
      unitPrice: 85000,
      subtotal: 170000,
      currency: "NGN"
    });
  });

  it("increments quantity when the product already exists in the active cart", async () => {
    const cartRepository = new CartRepositoryDouble();
    cartRepository.findActiveByBuyerId.mockResolvedValue(makeActiveCart());
    cartRepository.findItemByCartIdAndProductId.mockResolvedValue(
      makeCartItem({
        quantity: 2
      })
    );
    const addProductToCart = new AddProductToCart(
      new AuthenticationRepositoryDouble(),
      new ProductRepositoryDouble(),
      cartRepository
    );

    const result = await addProductToCart.execute({
      buyerId: "buyer-id",
      productId: "product-id",
      quantity: 3
    });

    expect(cartRepository.createCart).not.toHaveBeenCalled();
    expect(cartRepository.updateCartItemQuantity).toHaveBeenCalledWith({
      cartItemId: "cart-item-id",
      quantity: 5
    });
    expect(result.item.quantity).toBe(5);
    expect(result.subtotal).toBe(425000);
  });

  it("throws when the buyer account does not exist", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue(null);
    const addProductToCart = new AddProductToCart(
      authenticationRepository,
      new ProductRepositoryDouble(),
      new CartRepositoryDouble()
    );

    await expect(
      addProductToCart.execute({
        buyerId: "missing-buyer-id",
        productId: "product-id",
        quantity: 1
      })
    ).rejects.toBeInstanceOf(AddProductToCartError);
  });

  it("throws when the authenticated user is not a buyer", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      ...(awaitableBuyer()),
      role: "seller"
    });
    const addProductToCart = new AddProductToCart(
      authenticationRepository,
      new ProductRepositoryDouble(),
      new CartRepositoryDouble()
    );

    await expect(
      addProductToCart.execute({
        buyerId: "seller-id",
        productId: "product-id",
        quantity: 1
      })
    ).rejects.toBeInstanceOf(AddProductToCartError);
  });

  it("throws when the product is not approved", async () => {
    const productRepository = new ProductRepositoryDouble();
    productRepository.findById.mockResolvedValue(
      makeApprovedProduct({
        status: "pending_review"
      })
    );
    const addProductToCart = new AddProductToCart(
      new AuthenticationRepositoryDouble(),
      productRepository,
      new CartRepositoryDouble()
    );

    await expect(
      addProductToCart.execute({
        buyerId: "buyer-id",
        productId: "product-id",
        quantity: 1
      })
    ).rejects.toBeInstanceOf(AddProductToCartError);
  });

  it("throws when the requested quantity exceeds available stock", async () => {
    const addProductToCart = new AddProductToCart(
      new AuthenticationRepositoryDouble(),
      new ProductRepositoryDouble(),
      new CartRepositoryDouble()
    );

    await expect(
      addProductToCart.execute({
        buyerId: "buyer-id",
        productId: "product-id",
        quantity: 20
      })
    ).rejects.toBeInstanceOf(AddProductToCartError);
  });

  it("throws when the existing cart quantity plus requested quantity exceeds stock", async () => {
    const cartRepository = new CartRepositoryDouble();
    cartRepository.findActiveByBuyerId.mockResolvedValue(makeActiveCart());
    cartRepository.findItemByCartIdAndProductId.mockResolvedValue(
      makeCartItem({
        quantity: 8
      })
    );
    const addProductToCart = new AddProductToCart(
      new AuthenticationRepositoryDouble(),
      new ProductRepositoryDouble(),
      cartRepository
    );

    await expect(
      addProductToCart.execute({
        buyerId: "buyer-id",
        productId: "product-id",
        quantity: 3
      })
    ).rejects.toBeInstanceOf(AddProductToCartError);
  });

  it("throws when the quantity is not greater than zero", async () => {
    const addProductToCart = new AddProductToCart(
      new AuthenticationRepositoryDouble(),
      new ProductRepositoryDouble(),
      new CartRepositoryDouble()
    );

    await expect(
      addProductToCart.execute({
        buyerId: "buyer-id",
        productId: "product-id",
        quantity: 0
      })
    ).rejects.toBeInstanceOf(AddProductToCartError);
  });
});

function awaitableBuyer(): AuthUser {
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
    createdAt: new Date("2026-03-29T00:00:00.000Z"),
    updatedAt: new Date("2026-03-29T00:00:00.000Z")
  };
}
