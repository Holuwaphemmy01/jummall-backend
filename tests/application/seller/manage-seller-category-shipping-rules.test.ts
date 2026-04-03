import { describe, expect, it } from "@jest/globals";

import { CreateSellerCategoryShippingRule } from "../../../src/application/seller/create-category-shipping-rule";
import { GetSellerCategoryShippingRule } from "../../../src/application/seller/get-category-shipping-rule";
import { ListSellerCategoryShippingRules } from "../../../src/application/seller/list-category-shipping-rules";
import { SetSellerCategoryShippingRuleStatus } from "../../../src/application/seller/set-category-shipping-rule-status";
import { SellerShippingConfigurationError } from "../../../src/application/seller/shipping-configuration-error";
import { UpdateSellerCategoryShippingRule } from "../../../src/application/seller/update-category-shipping-rule";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  ProductCategoryRecord,
  ProductCategoryRepository,
  UpdateProductCategoryInput
} from "../../../src/ports/product-category-repository";
import type {
  ShippingSettingsRecord,
  ShippingSettingsRepository
} from "../../../src/ports/shipping/shipping-settings-repository";
import type {
  CategoryShippingRuleRepository,
  CreatePlatformCategoryShippingRuleInput,
  CreateVendorCategoryShippingRuleInput,
  UpdatePlatformCategoryShippingRuleInput,
  UpdatePlatformCategoryShippingRuleStatusInput,
  UpdateVendorCategoryShippingRuleInput,
  UpdateVendorCategoryShippingRuleStatusInput
} from "../../../src/ports/shipping/category-shipping-rule-repository";
import type {
  CategoryShippingRuleDetailRecord,
  ShippingMethodType
} from "../../../src/ports/shipping/shipping-models";

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  async findByEmail(): Promise<AuthUser | null> {
    return null;
  }

  async findById(): Promise<AuthUser | null> {
    return makeSeller();
  }

  async updatePassword(): Promise<void> {}
}

class ShippingSettingsRepositoryDouble implements ShippingSettingsRepository {
  async get(): Promise<ShippingSettingsRecord | null> {
    return makeSettings("VENDOR");
  }

  async update() {
    return makeSettings("VENDOR");
  }
}

class ProductCategoryRepositoryDouble implements ProductCategoryRepository {
  private readonly categories: ProductCategoryRecord[] = [
    makeCategory({ id: "category-1", name: "Electronics" }),
    makeCategory({ id: "category-2", name: "Furniture" })
  ];

  async create(): Promise<ProductCategoryRecord> {
    throw new Error("Not implemented.");
  }

  async findAll(): Promise<ProductCategoryRecord[]> {
    return this.categories;
  }

  async findById(categoryId: string): Promise<ProductCategoryRecord | null> {
    return this.categories.find((category) => category.id === categoryId) ?? null;
  }

  async findByName(): Promise<ProductCategoryRecord | null> {
    return null;
  }

  async update(
    _input: UpdateProductCategoryInput
  ): Promise<ProductCategoryRecord | null> {
    return null;
  }
}

class CategoryShippingRuleRepositoryDouble
  implements CategoryShippingRuleRepository
{
  private readonly rules: CategoryShippingRuleDetailRecord[] = [
    makeRule({
      id: "rule-1",
      categoryId: "category-1",
      categoryName: "Electronics"
    })
  ];

  async createPlatform(
    _input: CreatePlatformCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord> {
    throw new Error("Not implemented.");
  }

  async createVendor(
    input: CreateVendorCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord> {
    const rule = makeRule({
      id: `rule-${this.rules.length + 1}`,
      ownerId: input.ownerId,
      categoryId: input.categoryId,
      categoryName: input.categoryId === "category-2" ? "Furniture" : "Electronics",
      methodType: input.methodType,
      value: input.value,
      subtotalBands: (input.subtotalBands ?? []).map((band, index) =>
        makeSubtotalBand({
          id: `band-${this.rules.length + 1}-${index + 1}`,
          ...band
        })
      )
    });

    this.rules.push(rule);
    return rule;
  }

  async findAllPlatform(): Promise<CategoryShippingRuleDetailRecord[]> {
    return [];
  }

  async findAllVendor(
    ownerId: string
  ): Promise<CategoryShippingRuleDetailRecord[]> {
    return this.rules.filter((rule) => rule.ownerId === ownerId);
  }

  async findPlatformById(): Promise<CategoryShippingRuleDetailRecord | null> {
    return null;
  }

  async findVendorById(
    ownerId: string,
    ruleId: string
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    return (
      this.rules.find((rule) => rule.ownerId === ownerId && rule.id === ruleId) ??
      null
    );
  }

  async findPlatformByCategoryId(): Promise<CategoryShippingRuleDetailRecord | null> {
    return null;
  }

  async findVendorByCategoryId(
    ownerId: string,
    categoryId: string
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    return (
      this.rules.find(
        (rule) => rule.ownerId === ownerId && rule.categoryId === categoryId
      ) ?? null
    );
  }

  async updatePlatform(
    _input: UpdatePlatformCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    return null;
  }

  async updateVendor(
    input: UpdateVendorCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    const rule = await this.findVendorById(input.ownerId, input.ruleId);

    if (!rule) {
      return null;
    }

    rule.categoryId = input.categoryId ?? rule.categoryId;
    rule.categoryName = rule.categoryId === "category-2" ? "Furniture" : "Electronics";
    rule.methodType = input.methodType ?? rule.methodType;
    rule.value = input.value ?? rule.value;
    rule.subtotalBands =
      input.subtotalBands === undefined
        ? rule.subtotalBands
        : input.subtotalBands.map((band, index) =>
            makeSubtotalBand({
              id: `band-${rule.id}-${index + 1}`,
              ...band
            })
          );
    return rule;
  }

  async updatePlatformStatus(
    _input: UpdatePlatformCategoryShippingRuleStatusInput
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    return null;
  }

  async updateVendorStatus(
    input: UpdateVendorCategoryShippingRuleStatusInput
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    const rule = await this.findVendorById(input.ownerId, input.ruleId);

    if (!rule) {
      return null;
    }

    rule.status = input.status;
    return rule;
  }
}

describe("seller category shipping rules", () => {
  it("creates a seller category shipping rule", async () => {
    const useCase = new CreateSellerCategoryShippingRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ProductCategoryRepositoryDouble(),
      new CategoryShippingRuleRepositoryDouble()
    );

    const rule = await useCase.execute({
      sellerId: "seller-id",
      categoryId: "category-2",
      methodType: "percentage_based",
      value: 8,
      subtotalBands: [
        {
          minSubtotal: 0,
          maxSubtotal: 50000,
          methodType: "fixed_rate",
          value: 2000
        }
      ]
    });

    expect(rule.categoryId).toBe("category-2");
    expect(rule.subtotalBands).toHaveLength(1);
  });

  it("throws when the category does not exist", async () => {
    const useCase = new CreateSellerCategoryShippingRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ProductCategoryRepositoryDouble(),
      new CategoryShippingRuleRepositoryDouble()
    );

    await expect(
      useCase.execute({
        sellerId: "seller-id",
        categoryId: "missing-category",
        methodType: "fixed_rate",
        value: 1000
      })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("throws when the seller already has a rule for the category", async () => {
    const useCase = new CreateSellerCategoryShippingRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ProductCategoryRepositoryDouble(),
      new CategoryShippingRuleRepositoryDouble()
    );

    await expect(
      useCase.execute({
        sellerId: "seller-id",
        categoryId: "category-1",
        methodType: "fixed_rate",
        value: 1000
      })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("throws when a seller subtotal band is open-ended before the last band", async () => {
    const useCase = new CreateSellerCategoryShippingRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ProductCategoryRepositoryDouble(),
      new CategoryShippingRuleRepositoryDouble()
    );

    await expect(
      useCase.execute({
        sellerId: "seller-id",
        categoryId: "category-2",
        methodType: "fixed_rate",
        value: 1200,
        subtotalBands: [
          {
            minSubtotal: 0,
            maxSubtotal: null,
            methodType: "fixed_rate",
            value: 0
          },
          {
            minSubtotal: 50000,
            maxSubtotal: null,
            methodType: "fixed_rate",
            value: 500
          }
        ]
      })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("lists seller category shipping rules", async () => {
    const useCase = new ListSellerCategoryShippingRules(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new CategoryShippingRuleRepositoryDouble()
    );

    const rules = await useCase.execute({ sellerId: "seller-id" });

    expect(rules).toHaveLength(1);
  });

  it("throws when fetching a missing seller category shipping rule", async () => {
    const useCase = new GetSellerCategoryShippingRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new CategoryShippingRuleRepositoryDouble()
    );

    await expect(
      useCase.execute({ sellerId: "seller-id", ruleId: "missing-rule" })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("updates a seller category shipping rule", async () => {
    const useCase = new UpdateSellerCategoryShippingRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ProductCategoryRepositoryDouble(),
      new CategoryShippingRuleRepositoryDouble()
    );

    const rule = await useCase.execute({
      sellerId: "seller-id",
      ruleId: "rule-1",
      methodType: "percentage_based",
      value: 10,
      subtotalBands: []
    });

    expect(rule.methodType).toBe("percentage_based");
    expect(rule.subtotalBands).toHaveLength(0);
  });

  it("throws when updating a seller category shipping rule without fields", async () => {
    const useCase = new UpdateSellerCategoryShippingRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ProductCategoryRepositoryDouble(),
      new CategoryShippingRuleRepositoryDouble()
    );

    await expect(
      useCase.execute({ sellerId: "seller-id", ruleId: "rule-1" })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("updates the seller category shipping rule status", async () => {
    const useCase = new SetSellerCategoryShippingRuleStatus(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new CategoryShippingRuleRepositoryDouble()
    );

    const rule = await useCase.execute({
      sellerId: "seller-id",
      ruleId: "rule-1",
      status: "inactive"
    });

    expect(rule.status).toBe("inactive");
  });
});

function makeSeller(): AuthUser {
  return {
    id: "seller-id",
    firstName: "Jane",
    lastName: "Doe",
    username: "jane.doe",
    email: "jane@example.com",
    phone: "+2348012345678",
    passwordHash: "hashed-password",
    role: "seller",
    accountStatus: "verified",
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}

function makeSettings(
  shippingMode: ShippingSettingsRecord["shippingMode"]
): ShippingSettingsRecord {
  return {
    id: "shipping-settings",
    shippingMode,
    categoryShippingMode: "HIGHEST",
    vendorFallbackPolicy: "BLOCK_CHECKOUT",
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}

function makeCategory(
  overrides: Partial<ProductCategoryRecord> = {}
): ProductCategoryRecord {
  return {
    id: "category-1",
    name: "Electronics",
    description: "Devices",
    deductionPercentage: 12.5,
    image: null,
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z"),
    ...overrides
  };
}

function makeRule(
  overrides: Partial<CategoryShippingRuleDetailRecord> = {}
): CategoryShippingRuleDetailRecord {
  return {
    id: "rule-1",
    categoryId: "category-1",
    ownerType: "vendor",
    ownerId: "seller-id",
    categoryName: "Electronics",
    methodType: "fixed_rate",
    value: 1500,
    status: "active",
    subtotalBands: [],
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z"),
    ...overrides
  };
}

function makeSubtotalBand(overrides: {
  id: string;
  minSubtotal: number;
  maxSubtotal: number | null;
  methodType: ShippingMethodType;
  value: number;
}) {
  return {
    id: overrides.id,
    minSubtotal: overrides.minSubtotal,
    maxSubtotal: overrides.maxSubtotal,
    methodType: overrides.methodType,
    value: overrides.value,
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}
