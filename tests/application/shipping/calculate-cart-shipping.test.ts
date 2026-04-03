import { describe, expect, it } from "@jest/globals";

import {
  CalculateCartShipping,
  CalculateCartShippingError
} from "../../../src/application/shipping/calculate-cart-shipping";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  BillingAddressRecord,
  BillingAddressRepository
} from "../../../src/ports/billing-address-repository";
import type {
  CartItemRecord,
  CartRecord,
  CartRepository
} from "../../../src/ports/cart-repository";
import type { ProductRecord, ProductRepository } from "../../../src/ports/product-repository";
import type { CategoryShippingRuleRepository } from "../../../src/ports/shipping/category-shipping-rule-repository";
import type { FreeShippingRuleRepository } from "../../../src/ports/shipping/free-shipping-rule-repository";
import type {
  CategoryShippingRuleDetailRecord,
  FreeShippingRuleRecord,
  FreeShippingRuleStatus,
  FreeShippingRuleType,
  ShippingMethodType,
  ShippingOwnerType,
  ShippingRuleStatus,
  ShippingSubtotalBandInput,
  ShippingZoneDetailRecord,
  ShippingZoneRuleDetailRecord,
  ShippingZoneStatus
} from "../../../src/ports/shipping/shipping-models";
import type {
  ShippingSettingsRecord,
  ShippingSettingsRepository
} from "../../../src/ports/shipping/shipping-settings-repository";
import type { ShippingZoneRepository } from "../../../src/ports/shipping/shipping-zone-repository";
import type { ShippingZoneRuleRepository } from "../../../src/ports/shipping/shipping-zone-rule-repository";

describe("calculate cart shipping", () => {
  it("calculates platform shipping with a state-only zone", async () => {
    const useCase = createUseCase({
      shippingSettings: makeShippingSettings({ shippingMode: "PLATFORM" }),
      platformZones: [makeZone({ id: "zone-1", states: [{ stateName: "Lagos" }] })],
      platformZoneRules: [makeZoneRule({ zoneId: "zone-1", value: 1500 })]
    });

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      discountedSubtotal: 20000
    });

    expect(result.baseShippingFee).toBe(1500);
    expect(result.finalShippingFee).toBe(1500);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].matchedZone.matchType).toBe("state");
    expect(result.breakdown[0].ruleOwnerType).toBe("platform");
  });

  it("prefers a city-specific zone over a state-only zone", async () => {
    const useCase = createUseCase({
      platformZones: [
        makeZone({ id: "zone-state", states: [{ stateName: "Lagos" }] }),
        makeZone({
          id: "zone-city",
          name: "Ikeja Zone",
          states: [{ stateName: "Lagos", cities: ["Ikeja"] }]
        })
      ],
      platformZoneRules: [
        makeZoneRule({ zoneId: "zone-state", value: 2000 }),
        makeZoneRule({ zoneId: "zone-city", value: 1000 })
      ]
    });

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      discountedSubtotal: 20000
    });

    expect(result.baseShippingFee).toBe(1000);
    expect(result.breakdown[0].matchedZone.id).toBe("zone-city");
    expect(result.breakdown[0].matchedZone.matchType).toBe("city");
  });

  it("calculates vendor shipping for multiple sellers and returns a unified total", async () => {
    const useCase = createUseCase({
      cartItems: [
        makeCartItem({ id: "cart-item-1", productId: "product-1" }),
        makeCartItem({ id: "cart-item-2", productId: "product-2" })
      ],
      products: [
        makeProduct({ id: "product-1", sellerId: "seller-1", price: 10000 }),
        makeProduct({ id: "product-2", sellerId: "seller-2", price: 20000 })
      ],
      shippingSettings: makeShippingSettings({ shippingMode: "VENDOR" }),
      vendorZones: [
        makeZone({
          id: "seller-zone-1",
          ownerType: "vendor",
          ownerId: "seller-1",
          states: [{ stateName: "Lagos", cities: ["Ikeja"] }]
        }),
        makeZone({
          id: "seller-zone-2",
          ownerType: "vendor",
          ownerId: "seller-2",
          states: [{ stateName: "Lagos", cities: ["Ikeja"] }]
        })
      ],
      vendorZoneRules: [
        makeZoneRule({
          id: "vendor-rule-1",
          ownerType: "vendor",
          ownerId: "seller-1",
          zoneId: "seller-zone-1",
          value: 1000
        }),
        makeZoneRule({
          id: "vendor-rule-2",
          ownerType: "vendor",
          ownerId: "seller-2",
          zoneId: "seller-zone-2",
          value: 2000
        })
      ]
    });

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      discountedSubtotal: 30000
    });

    expect(result.baseShippingFee).toBe(3000);
    expect(result.breakdown).toHaveLength(2);
    expect(result.breakdown[0].finalShippingOwnerType).toBe("vendor");
    expect(result.breakdown[1].finalShippingOwnerType).toBe("vendor");
  });

  it("uses platform zone fallback when seller zone shipping is missing", async () => {
    const useCase = createUseCase({
      shippingSettings: makeShippingSettings({
        shippingMode: "VENDOR",
        vendorFallbackPolicy: "USE_PLATFORM_RULES"
      }),
      platformZones: [makeZone({ id: "zone-1", states: [{ stateName: "Lagos" }] })],
      platformZoneRules: [makeZoneRule({ zoneId: "zone-1", value: 1500 })],
      vendorZones: [],
      vendorZoneRules: []
    });

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      discountedSubtotal: 20000
    });

    expect(result.baseShippingFee).toBe(1500);
    expect(result.breakdown[0].usedFallback).toBe(true);
    expect(result.breakdown[0].ruleOwnerType).toBe("platform");
    expect(result.breakdown[0].finalShippingOwnerType).toBe("vendor");
  });

  it("uses platform category fallback only for missing vendor category components", async () => {
    const useCase = createUseCase({
      shippingSettings: makeShippingSettings({
        shippingMode: "VENDOR",
        vendorFallbackPolicy: "USE_PLATFORM_RULES"
      }),
      vendorZones: [
        makeZone({
          id: "seller-zone-1",
          ownerType: "vendor",
          ownerId: "seller-1",
          states: [{ stateName: "Lagos", cities: ["Ikeja"] }]
        })
      ],
      vendorZoneRules: [
        makeZoneRule({
          ownerType: "vendor",
          ownerId: "seller-1",
          zoneId: "seller-zone-1",
          value: 1000
        })
      ],
      platformCategoryRules: [makeCategoryRule({ categoryId: "category-1", value: 2000 })]
    });

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      discountedSubtotal: 20000
    });

    expect(result.baseShippingFee).toBe(2000);
    expect(result.breakdown[0].usedFallback).toBe(true);
    expect(result.breakdown[0].categoryFee).toBe(2000);
    expect(result.breakdown[0].ruleOwnerType).toBe("platform");
  });

  it("blocks checkout when seller zone shipping is missing and fallback is disabled", async () => {
    const useCase = createUseCase({
      shippingSettings: makeShippingSettings({
        shippingMode: "VENDOR",
        vendorFallbackPolicy: "BLOCK_CHECKOUT"
      }),
      vendorZones: [],
      vendorZoneRules: []
    });

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        billingAddressId: "address-1",
        discountedSubtotal: 20000
      })
    ).rejects.toBeInstanceOf(CalculateCartShippingError);
  });

  it("aggregates category fees with HIGHEST mode", async () => {
    const useCase = createUseCase({
      cartItems: [
        makeCartItem({ id: "cart-item-1", productId: "product-1" }),
        makeCartItem({ id: "cart-item-2", productId: "product-2" })
      ],
      products: [
        makeProduct({ id: "product-1", categoryId: "category-1", price: 10000 }),
        makeProduct({ id: "product-2", categoryId: "category-2", price: 15000 })
      ],
      shippingSettings: makeShippingSettings({ categoryShippingMode: "HIGHEST" }),
      platformCategoryRules: [
        makeCategoryRule({ categoryId: "category-1", value: 1500 }),
        makeCategoryRule({ categoryId: "category-2", value: 5000 })
      ]
    });

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      discountedSubtotal: 25000
    });

    expect(result.breakdown[0].categoryFee).toBe(5000);
    expect(result.baseShippingFee).toBe(5000);
  });

  it("aggregates category fees with ADDITIVE mode", async () => {
    const useCase = createUseCase({
      cartItems: [
        makeCartItem({ id: "cart-item-1", productId: "product-1" }),
        makeCartItem({ id: "cart-item-2", productId: "product-2" })
      ],
      products: [
        makeProduct({ id: "product-1", categoryId: "category-1", price: 10000 }),
        makeProduct({ id: "product-2", categoryId: "category-2", price: 15000 })
      ],
      shippingSettings: makeShippingSettings({ categoryShippingMode: "ADDITIVE" }),
      platformCategoryRules: [
        makeCategoryRule({ categoryId: "category-1", value: 1500 }),
        makeCategoryRule({ categoryId: "category-2", value: 5000 })
      ]
    });

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      discountedSubtotal: 25000
    });

    expect(result.breakdown[0].categoryFee).toBe(6500);
    expect(result.baseShippingFee).toBe(6500);
  });

  it("selects the matching zone-rule subtotal band", async () => {
    const useCase = createUseCase({
      products: [makeProduct({ id: "product-1", price: 25000 })],
      platformZoneRules: [
        makeZoneRule({
          zoneId: "zone-1",
          value: 3000,
          subtotalBands: [
            makeSubtotalBand({ minSubtotal: 0, maxSubtotal: 20000, value: 2500 }),
            makeSubtotalBand({ minSubtotal: 20000, maxSubtotal: null, value: 1500 })
          ]
        })
      ]
    });

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      discountedSubtotal: 25000
    });

    expect(result.breakdown[0].zoneFee).toBe(1500);
  });

  it("selects the matching category-rule subtotal band", async () => {
    const useCase = createUseCase({
      products: [makeProduct({ id: "product-1", price: 25000 })],
      platformZoneRules: [makeZoneRule({ zoneId: "zone-1", value: 500 })],
      platformCategoryRules: [
        makeCategoryRule({
          categoryId: "category-1",
          value: 3000,
          subtotalBands: [
            makeSubtotalBand({ minSubtotal: 0, maxSubtotal: 20000, value: 1000 }),
            makeSubtotalBand({ minSubtotal: 20000, maxSubtotal: null, value: 2000 })
          ]
        })
      ]
    });

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      discountedSubtotal: 25000
    });

    expect(result.breakdown[0].categoryFee).toBe(2000);
    expect(result.baseShippingFee).toBe(2000);
  });
});

function createUseCase(overrides: {
  users?: AuthUser[];
  addresses?: BillingAddressRecord[];
  cart?: CartRecord | null;
  cartItems?: CartItemRecord[];
  products?: ProductRecord[];
  shippingSettings?: ShippingSettingsRecord | null;
  platformZones?: ShippingZoneDetailRecord[];
  vendorZones?: ShippingZoneDetailRecord[];
  platformZoneRules?: ShippingZoneRuleDetailRecord[];
  vendorZoneRules?: ShippingZoneRuleDetailRecord[];
  platformCategoryRules?: CategoryShippingRuleDetailRecord[];
  vendorCategoryRules?: CategoryShippingRuleDetailRecord[];
  freeShippingRules?: FreeShippingRuleRecord[];
} = {}) {
  return new CalculateCartShipping(
    createAuthenticationRepository(
      overrides.users ?? [makeUser({ id: "buyer-1", role: "buyer" })]
    ),
    createBillingAddressRepository(
      overrides.addresses ?? [makeBillingAddress({ id: "address-1" })]
    ),
    createCartRepository(
      overrides.cart === undefined
        ? makeCart({ id: "cart-1", buyerId: "buyer-1" })
        : overrides.cart,
      overrides.cartItems ?? [makeCartItem({ id: "cart-item-1", productId: "product-1" })]
    ),
    createProductRepository(
      overrides.products ?? [makeProduct({ id: "product-1" })]
    ),
    createShippingSettingsRepository(
      overrides.shippingSettings ?? makeShippingSettings()
    ),
    createShippingZoneRepository(
      overrides.platformZones ??
        [makeZone({ id: "zone-1", states: [{ stateName: "Lagos", cities: ["Ikeja"] }] })],
      overrides.vendorZones ?? []
    ),
    createShippingZoneRuleRepository(
      overrides.platformZoneRules ?? [makeZoneRule({ zoneId: "zone-1", value: 1000 })],
      overrides.vendorZoneRules ?? []
    ),
    createCategoryShippingRuleRepository(
      overrides.platformCategoryRules ?? [],
      overrides.vendorCategoryRules ?? []
    ),
    createFreeShippingRuleRepository(overrides.freeShippingRules ?? [])
  );
}

function createAuthenticationRepository(users: AuthUser[]): AuthenticationRepository {
  return {
    findByEmail: async () => null,
    findById: async (userId) => users.find((user) => user.id === userId) ?? null,
    updatePassword: async () => undefined
  };
}

function createBillingAddressRepository(
  addresses: BillingAddressRecord[]
): BillingAddressRepository {
  return {
    create: async () => {
      throw new Error("Not implemented in this test.");
    },
    findByBuyerId: async (buyerId) =>
      addresses.filter((address) => address.buyerId === buyerId),
    findByIdAndBuyerId: async (billingAddressId, buyerId) =>
      addresses.find(
        (address) =>
          address.id === billingAddressId && address.buyerId === buyerId
      ) ?? null,
    deleteByIdAndBuyerId: async () => null
  };
}

function createCartRepository(
  cart: CartRecord | null,
  items: CartItemRecord[]
): CartRepository {
  return {
    findActiveByBuyerId: async (buyerId) =>
      cart?.buyerId === buyerId ? cart : null,
    createCart: async () => {
      throw new Error("Not implemented in this test.");
    },
    findItemsByCartId: async (cartId) =>
      items.filter((item) => item.cartId === cartId),
    clearItemsByCartId: async () => 0,
    findItemByCartIdAndProductId: async () => null,
    createCartItem: async () => {
      throw new Error("Not implemented in this test.");
    },
    deleteCartItem: async () => null,
    updateCartItemQuantity: async () => null
  };
}

function createProductRepository(products: ProductRecord[]): ProductRepository {
  return {
    create: async () => {
      throw new Error("Not implemented in this test.");
    },
    findById: async (productId) =>
      products.find((product) => product.id === productId) ?? null,
    findBySellerId: async (sellerId) =>
      products.filter((product) => product.sellerId === sellerId),
    findPendingReview: async () => [],
    updateStatus: async () => null
  };
}

function createShippingSettingsRepository(
  settings: ShippingSettingsRecord | null
): ShippingSettingsRepository {
  return {
    get: async () => settings,
    update: async () => settings
  };
}

function createShippingZoneRepository(
  platformZones: ShippingZoneDetailRecord[],
  vendorZones: ShippingZoneDetailRecord[]
): ShippingZoneRepository {
  const findMatchingZones = (
    zones: ShippingZoneDetailRecord[],
    stateName: string,
    cityName?: string | null
  ) => {
    const normalizedStateName = stateName.trim().toLowerCase();
    const normalizedCityName = cityName?.trim().toLowerCase() ?? null;

    return zones.filter((zone) => {
      if (zone.status !== "active") {
        return false;
      }

      return zone.states.some((state) => {
        if (state.stateName.trim().toLowerCase() !== normalizedStateName) {
          return false;
        }

        if (state.cities.length === 0) {
          return true;
        }

        if (!normalizedCityName) {
          return false;
        }

        return state.cities.some(
          (city) => city.cityName.trim().toLowerCase() === normalizedCityName
        );
      });
    });
  };

  return {
    createPlatform: async () => {
      throw new Error("Not implemented in this test.");
    },
    createVendor: async () => {
      throw new Error("Not implemented in this test.");
    },
    findAllPlatform: async () => platformZones,
    findAllVendor: async (ownerId) =>
      vendorZones.filter((zone) => zone.ownerId === ownerId),
    findMatchingActivePlatform: async (input) =>
      findMatchingZones(platformZones, input.stateName, input.cityName),
    findMatchingActiveVendor: async (input) =>
      findMatchingZones(
        vendorZones.filter((zone) => zone.ownerId === input.ownerId),
        input.stateName,
        input.cityName
      ),
    findPlatformById: async (zoneId) =>
      platformZones.find((zone) => zone.id === zoneId) ?? null,
    findVendorById: async (ownerId, zoneId) =>
      vendorZones.find(
        (zone) => zone.ownerId === ownerId && zone.id === zoneId
      ) ?? null,
    findPlatformByName: async (name) =>
      platformZones.find((zone) => zone.name === name) ?? null,
    findVendorByName: async (ownerId, name) =>
      vendorZones.find(
        (zone) => zone.ownerId === ownerId && zone.name === name
      ) ?? null,
    updatePlatform: async () => null,
    updateVendor: async () => null,
    updatePlatformStatus: async () => null,
    updateVendorStatus: async () => null
  };
}

function createShippingZoneRuleRepository(
  platformRules: ShippingZoneRuleDetailRecord[],
  vendorRules: ShippingZoneRuleDetailRecord[]
): ShippingZoneRuleRepository {
  return {
    createPlatform: async () => {
      throw new Error("Not implemented in this test.");
    },
    createVendor: async () => {
      throw new Error("Not implemented in this test.");
    },
    findAllPlatform: async () => platformRules,
    findAllVendor: async (ownerId) =>
      vendorRules.filter((rule) => rule.ownerId === ownerId),
    findPlatformById: async (ruleId) =>
      platformRules.find((rule) => rule.id === ruleId) ?? null,
    findVendorById: async (ownerId, ruleId) =>
      vendorRules.find(
        (rule) => rule.ownerId === ownerId && rule.id === ruleId
      ) ?? null,
    findPlatformByZoneId: async (zoneId) =>
      platformRules.find((rule) => rule.zoneId === zoneId) ?? null,
    findVendorByZoneId: async (ownerId, zoneId) =>
      vendorRules.find(
        (rule) => rule.ownerId === ownerId && rule.zoneId === zoneId
      ) ?? null,
    updatePlatform: async () => null,
    updateVendor: async () => null,
    updatePlatformStatus: async () => null,
    updateVendorStatus: async () => null
  };
}

function createCategoryShippingRuleRepository(
  platformRules: CategoryShippingRuleDetailRecord[],
  vendorRules: CategoryShippingRuleDetailRecord[]
): CategoryShippingRuleRepository {
  return {
    createPlatform: async () => {
      throw new Error("Not implemented in this test.");
    },
    createVendor: async () => {
      throw new Error("Not implemented in this test.");
    },
    findAllPlatform: async () => platformRules,
    findAllVendor: async (ownerId) =>
      vendorRules.filter((rule) => rule.ownerId === ownerId),
    findPlatformById: async (ruleId) =>
      platformRules.find((rule) => rule.id === ruleId) ?? null,
    findVendorById: async (ownerId, ruleId) =>
      vendorRules.find(
        (rule) => rule.ownerId === ownerId && rule.id === ruleId
      ) ?? null,
    findPlatformByCategoryId: async (categoryId) =>
      platformRules.find((rule) => rule.categoryId === categoryId) ?? null,
    findVendorByCategoryId: async (ownerId, categoryId) =>
      vendorRules.find(
        (rule) => rule.ownerId === ownerId && rule.categoryId === categoryId
      ) ?? null,
    updatePlatform: async () => null,
    updateVendor: async () => null,
    updatePlatformStatus: async () => null,
    updateVendorStatus: async () => null
  };
}

function createFreeShippingRuleRepository(
  rules: FreeShippingRuleRecord[]
): FreeShippingRuleRepository {
  return {
    create: async () => {
      throw new Error("Not implemented in this test.");
    },
    findAll: async () => rules,
    findById: async (ruleId) => rules.find((rule) => rule.id === ruleId) ?? null,
    findByCouponCode: async (couponCode) =>
      rules.find(
        (rule) => rule.couponCode?.toLowerCase() === couponCode.toLowerCase()
      ) ?? null,
    findActiveByCouponCode: async (couponCode) =>
      rules.find(
        (rule) =>
          rule.status === "active" &&
          rule.couponCode?.toLowerCase() === couponCode.toLowerCase()
      ) ?? null,
    findActiveThresholdRule: async () =>
      rules.find(
        (rule) => rule.type === "threshold" && rule.status === "active"
      ) ?? null,
    update: async () => null,
    updateStatus: async () => null
  };
}

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: overrides.id ?? "buyer-1",
    firstName: "Jane",
    lastName: "Doe",
    username: "jane",
    email: "jane@example.com",
    phone: "+2348012345678",
    passwordHash: "hashed-password",
    role: overrides.role ?? "buyer",
    accountStatus: "verified",
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}

function makeBillingAddress(
  overrides: Partial<BillingAddressRecord> = {}
): BillingAddressRecord {
  return {
    id: overrides.id ?? "address-1",
    buyerId: overrides.buyerId ?? "buyer-1",
    fullName: "Jane Doe",
    phoneNumber: "+2348012345678",
    addressLine1: "12 Allen Avenue",
    addressLine2: null,
    city: overrides.city ?? "Ikeja",
    state: overrides.state ?? "Lagos",
    country: "Nigeria",
    postalCode: null,
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}

function makeCart(overrides: Partial<CartRecord> = {}): CartRecord {
  return {
    id: overrides.id ?? "cart-1",
    buyerId: overrides.buyerId ?? "buyer-1",
    status: "active",
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}

function makeCartItem(overrides: Partial<CartItemRecord> = {}): CartItemRecord {
  return {
    id: overrides.id ?? "cart-item-1",
    cartId: overrides.cartId ?? "cart-1",
    productId: overrides.productId ?? "product-1",
    quantity: overrides.quantity ?? 1,
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}

function makeProduct(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: overrides.id ?? "product-1",
    sellerId: overrides.sellerId ?? "seller-1",
    categoryId: overrides.categoryId ?? "category-1",
    brandId: null,
    brandName: null,
    name: "Wireless Headset",
    description: "Noise-cancelling headset",
    sku: null,
    price: overrides.price ?? 20000,
    quantity: overrides.quantity ?? 10,
    currency: overrides.currency ?? "NGN",
    condition: "new",
    weightKg: 0.4,
    status: overrides.status ?? "approved",
    reviewNote: null,
    reviewedAt: null,
    images: [],
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}

function makeShippingSettings(
  overrides: Partial<ShippingSettingsRecord> = {}
): ShippingSettingsRecord {
  return {
    id: "shipping-settings",
    shippingMode: overrides.shippingMode ?? "PLATFORM",
    categoryShippingMode: overrides.categoryShippingMode ?? "HIGHEST",
    vendorFallbackPolicy: overrides.vendorFallbackPolicy ?? "BLOCK_CHECKOUT",
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}

function makeZone(overrides: {
  id?: string;
  ownerType?: ShippingOwnerType;
  ownerId?: string | null;
  name?: string;
  status?: ShippingZoneStatus;
  states?: Array<{ stateName: string; cities?: string[] }>;
} = {}): ShippingZoneDetailRecord {
  const zoneId = overrides.id ?? "zone-1";

  return {
    id: zoneId,
    ownerType: overrides.ownerType ?? "platform",
    ownerId: overrides.ownerId ?? null,
    name: overrides.name ?? "Lagos Zone",
    status: overrides.status ?? "active",
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z"),
    states: (overrides.states ?? [{ stateName: "Lagos", cities: [] }]).map(
      (state, stateIndex) => ({
        id: `${zoneId}-state-${stateIndex + 1}`,
        zoneId,
        stateName: state.stateName,
        cities: (state.cities ?? []).map((cityName, cityIndex) => ({
          id: `${zoneId}-city-${cityIndex + 1}`,
          zoneStateId: `${zoneId}-state-${stateIndex + 1}`,
          cityName
        }))
      })
    )
  };
}

function makeZoneRule(overrides: {
  id?: string;
  zoneId?: string;
  ownerType?: ShippingOwnerType;
  ownerId?: string | null;
  methodType?: ShippingMethodType;
  value?: number;
  status?: ShippingRuleStatus;
  subtotalBands?: ShippingSubtotalBandInput[];
} = {}): ShippingZoneRuleDetailRecord {
  const zoneId = overrides.zoneId ?? "zone-1";

  return {
    id: overrides.id ?? `${zoneId}-rule`,
    zoneId,
    ownerType: overrides.ownerType ?? "platform",
    ownerId: overrides.ownerId ?? null,
    zoneName: zoneId,
    methodType: overrides.methodType ?? "fixed_rate",
    value: overrides.value ?? 1000,
    status: overrides.status ?? "active",
    subtotalBands: (overrides.subtotalBands ?? []).map((band, index) => ({
      id: `${zoneId}-band-${index + 1}`,
      minSubtotal: band.minSubtotal,
      maxSubtotal: band.maxSubtotal,
      methodType: band.methodType,
      value: band.value,
      createdAt: new Date("2026-04-03T00:00:00.000Z"),
      updatedAt: new Date("2026-04-03T00:00:00.000Z")
    })),
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}

function makeCategoryRule(overrides: {
  id?: string;
  categoryId?: string;
  ownerType?: ShippingOwnerType;
  ownerId?: string | null;
  methodType?: ShippingMethodType;
  value?: number;
  status?: ShippingRuleStatus;
  subtotalBands?: ShippingSubtotalBandInput[];
} = {}): CategoryShippingRuleDetailRecord {
  const categoryId = overrides.categoryId ?? "category-1";

  return {
    id: overrides.id ?? `${categoryId}-rule`,
    categoryId,
    categoryName: categoryId,
    ownerType: overrides.ownerType ?? "platform",
    ownerId: overrides.ownerId ?? null,
    methodType: overrides.methodType ?? "fixed_rate",
    value: overrides.value ?? 1000,
    status: overrides.status ?? "active",
    subtotalBands: (overrides.subtotalBands ?? []).map((band, index) => ({
      id: `${categoryId}-band-${index + 1}`,
      minSubtotal: band.minSubtotal,
      maxSubtotal: band.maxSubtotal,
      methodType: band.methodType,
      value: band.value,
      createdAt: new Date("2026-04-03T00:00:00.000Z"),
      updatedAt: new Date("2026-04-03T00:00:00.000Z")
    })),
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}

function makeFreeShippingRule(overrides: {
  id?: string;
  name?: string;
  type?: FreeShippingRuleType;
  couponCode?: string | null;
  minimumOrderSubtotal?: number | null;
  status?: FreeShippingRuleStatus;
} = {}): FreeShippingRuleRecord {
  return {
    id: overrides.id ?? "free-shipping-rule-1",
    name: overrides.name ?? "Free Shipping",
    type: overrides.type ?? "coupon",
    couponCode: overrides.couponCode ?? "FREESHIP",
    minimumOrderSubtotal: overrides.minimumOrderSubtotal ?? null,
    status: overrides.status ?? "active",
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}

function makeSubtotalBand(overrides: {
  minSubtotal: number;
  maxSubtotal: number | null;
  value: number;
  methodType?: ShippingMethodType;
}): ShippingSubtotalBandInput {
  return {
    minSubtotal: overrides.minSubtotal,
    maxSubtotal: overrides.maxSubtotal,
    methodType: overrides.methodType ?? "fixed_rate",
    value: overrides.value
  };
}

describe("calculate cart shipping additional scenarios", () => {
  it("rounds percentage-based shipping to the nearest whole unit", async () => {
    const useCase = createUseCase({
      products: [makeProduct({ id: "product-1", price: 10005 })],
      platformZoneRules: [
        makeZoneRule({
          zoneId: "zone-1",
          methodType: "percentage_based",
          value: 10
        })
      ]
    });

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      discountedSubtotal: 10005
    });

    expect(result.breakdown[0].zoneFee).toBe(1001);
  });

  it("prorates discounts across cart lines before category percentage shipping is calculated", async () => {
    const useCase = createUseCase({
      cartItems: [
        makeCartItem({ id: "cart-item-a", productId: "product-a" }),
        makeCartItem({ id: "cart-item-b", productId: "product-b" })
      ],
      products: [
        makeProduct({ id: "product-a", categoryId: "category-1", price: 100 }),
        makeProduct({ id: "product-b", categoryId: "category-2", price: 50 })
      ],
      shippingSettings: makeShippingSettings({ categoryShippingMode: "ADDITIVE" }),
      platformZoneRules: [makeZoneRule({ zoneId: "zone-1", value: 10 })],
      platformCategoryRules: [
        makeCategoryRule({
          categoryId: "category-1",
          methodType: "percentage_based",
          value: 10
        }),
        makeCategoryRule({
          categoryId: "category-2",
          methodType: "percentage_based",
          value: 10
        })
      ]
    });

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      discountedSubtotal: 140
    });

    expect(result.breakdown[0].categoryFee).toBe(14);
    expect(result.baseShippingFee).toBe(14);
  });

  it("applies coupon-based free shipping after base shipping is calculated", async () => {
    const useCase = createUseCase({
      platformZoneRules: [makeZoneRule({ zoneId: "zone-1", value: 1500 })],
      freeShippingRules: [
        makeFreeShippingRule({
          id: "free-rule-1",
          type: "coupon",
          couponCode: "FREESHIP",
          minimumOrderSubtotal: null
        })
      ]
    });

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      discountedSubtotal: 20000,
      freeShippingCouponCode: "freeship"
    });

    expect(result.baseShippingFee).toBe(1500);
    expect(result.finalShippingFee).toBe(0);
    expect(result.freeShipping.applied).toBe(true);
    expect(result.freeShipping.ruleId).toBe("free-rule-1");
    expect(result.breakdown[0].finalShippingOwnerType).toBe("platform");
    expect(result.breakdown[0].finalShippingFee).toBe(0);
  });

  it("throws when a supplied free-shipping coupon is invalid", async () => {
    const useCase = createUseCase();

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        billingAddressId: "address-1",
        discountedSubtotal: 20000,
        freeShippingCouponCode: "INVALID"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "free_shipping_coupon_code"
    });
  });

  it("applies threshold free shipping in vendor mode and moves final shipping ownership to platform", async () => {
    const useCase = createUseCase({
      products: [makeProduct({ id: "product-1", price: 60000 })],
      shippingSettings: makeShippingSettings({ shippingMode: "VENDOR" }),
      vendorZones: [
        makeZone({
          id: "seller-zone-1",
          ownerType: "vendor",
          ownerId: "seller-1",
          states: [{ stateName: "Lagos", cities: ["Ikeja"] }]
        })
      ],
      vendorZoneRules: [
        makeZoneRule({
          ownerType: "vendor",
          ownerId: "seller-1",
          zoneId: "seller-zone-1",
          value: 2000
        })
      ],
      freeShippingRules: [
        makeFreeShippingRule({
          id: "threshold-rule-1",
          type: "threshold",
          couponCode: null,
          minimumOrderSubtotal: 50000
        })
      ]
    });

    const result = await useCase.execute({
      buyerId: "buyer-1",
      billingAddressId: "address-1",
      discountedSubtotal: 60000
    });

    expect(result.baseShippingFee).toBe(2000);
    expect(result.finalShippingFee).toBe(0);
    expect(result.freeShipping.ruleType).toBe("threshold");
    expect(result.breakdown[0].finalShippingOwnerType).toBe("platform");
  });

  it("throws when multiple equally specific zones match the same address", async () => {
    const useCase = createUseCase({
      platformZones: [
        makeZone({ id: "zone-1", states: [{ stateName: "Lagos", cities: ["Ikeja"] }] }),
        makeZone({ id: "zone-2", states: [{ stateName: "Lagos", cities: ["Ikeja"] }] })
      ],
      platformZoneRules: [
        makeZoneRule({ zoneId: "zone-1", value: 1000 }),
        makeZoneRule({ zoneId: "zone-2", value: 1200 })
      ]
    });

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        billingAddressId: "address-1",
        discountedSubtotal: 20000
      })
    ).rejects.toBeInstanceOf(CalculateCartShippingError);
  });

  it("throws when the cart contains mixed currencies", async () => {
    const useCase = createUseCase({
      cartItems: [
        makeCartItem({ id: "cart-item-1", productId: "product-1" }),
        makeCartItem({ id: "cart-item-2", productId: "product-2" })
      ],
      products: [
        makeProduct({ id: "product-1", currency: "NGN" }),
        makeProduct({ id: "product-2", currency: "USD" })
      ]
    });

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        billingAddressId: "address-1",
        discountedSubtotal: 30000
      })
    ).rejects.toMatchObject({ field: "currency" });
  });

  it("throws when a cart product can no longer be loaded", async () => {
    const useCase = createUseCase({ products: [] });

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        billingAddressId: "address-1",
        discountedSubtotal: 20000
      })
    ).rejects.toBeInstanceOf(CalculateCartShippingError);
  });

  it("throws when a cart product is no longer approved", async () => {
    const useCase = createUseCase({
      products: [makeProduct({ id: "product-1", status: "rejected" })]
    });

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        billingAddressId: "address-1",
        discountedSubtotal: 20000
      })
    ).rejects.toBeInstanceOf(CalculateCartShippingError);
  });

  it("throws when a cart quantity exceeds the available product quantity", async () => {
    const useCase = createUseCase({
      cartItems: [makeCartItem({ quantity: 2 })],
      products: [makeProduct({ quantity: 1 })]
    });

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        billingAddressId: "address-1",
        discountedSubtotal: 20000
      })
    ).rejects.toBeInstanceOf(CalculateCartShippingError);
  });

  it("throws when the buyer has no active cart", async () => {
    const useCase = createUseCase({ cart: null });

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        billingAddressId: "address-1",
        discountedSubtotal: 0
      })
    ).rejects.toBeInstanceOf(CalculateCartShippingError);
  });

  it("throws when the active cart is empty", async () => {
    const useCase = createUseCase({ cartItems: [] });

    await expect(
      useCase.execute({
        buyerId: "buyer-1",
        billingAddressId: "address-1",
        discountedSubtotal: 0
      })
    ).rejects.toBeInstanceOf(CalculateCartShippingError);
  });
});
