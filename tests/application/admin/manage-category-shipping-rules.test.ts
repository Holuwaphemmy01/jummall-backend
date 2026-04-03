import { describe, expect, it } from "@jest/globals";

import { CreateCategoryShippingRule } from "../../../src/application/admin/create-category-shipping-rule";
import { GetCategoryShippingRule } from "../../../src/application/admin/get-category-shipping-rule";
import { ListCategoryShippingRules } from "../../../src/application/admin/list-category-shipping-rules";
import { SetCategoryShippingRuleStatus } from "../../../src/application/admin/set-category-shipping-rule-status";
import { ShippingConfigurationError } from "../../../src/application/admin/shipping-configuration-error";
import { UpdateCategoryShippingRule } from "../../../src/application/admin/update-category-shipping-rule";
import type {
  CategoryShippingRuleDetailRecord,
  ShippingRuleStatus
} from "../../../src/ports/shipping/shipping-models";
import type { ProductCategoryRecord, ProductCategoryRepository, UpdateProductCategoryInput } from "../../../src/ports/product-category-repository";
import type {
  CategoryShippingRuleRepository,
  CreatePlatformCategoryShippingRuleInput,
  UpdatePlatformCategoryShippingRuleInput,
  UpdatePlatformCategoryShippingRuleStatusInput
} from "../../../src/ports/shipping/category-shipping-rule-repository";

class ProductCategoryRepositoryDouble implements ProductCategoryRepository {
  private readonly categories: ProductCategoryRecord[] = [
    {
      id: "category-1",
      name: "Electronics",
      description: "Devices and gadgets",
      deductionPercentage: 12.5,
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z")
    },
    {
      id: "category-2",
      name: "Furniture",
      description: "Home and office furniture",
      deductionPercentage: 10,
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z")
    }
  ];

  create(): Promise<ProductCategoryRecord> {
    throw new Error("Not implemented in this test double.");
  }

  findAll(): Promise<ProductCategoryRecord[]> {
    return Promise.resolve(this.categories);
  }

  findById(categoryId: string): Promise<ProductCategoryRecord | null> {
    return Promise.resolve(
      this.categories.find((category) => category.id === categoryId) ?? null
    );
  }

  findByName(): Promise<ProductCategoryRecord | null> {
    return Promise.resolve(null);
  }

  update(
    _input: UpdateProductCategoryInput
  ): Promise<ProductCategoryRecord | null> {
    throw new Error("Not implemented in this test double.");
  }
}

class CategoryShippingRuleRepositoryDouble
  implements CategoryShippingRuleRepository
{
  private rules: CategoryShippingRuleDetailRecord[] = [
    {
      id: "rule-1",
      categoryId: "category-1",
      categoryName: "Electronics",
      ownerType: "platform",
      ownerId: null,
      methodType: "fixed_rate",
      value: 1500,
      status: "active",
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z")
    }
  ];

  async createPlatform(
    input: CreatePlatformCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord> {
    const rule: CategoryShippingRuleDetailRecord = {
      id: `rule-${this.rules.length + 1}`,
      categoryId: input.categoryId,
      categoryName:
        input.categoryId === "category-2" ? "Furniture" : "Electronics",
      ownerType: "platform",
      ownerId: null,
      methodType: input.methodType,
      value: input.value,
      status: "active",
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z")
    };

    this.rules.push(rule);

    return rule;
  }

  async findAllPlatform(): Promise<CategoryShippingRuleDetailRecord[]> {
    return this.rules;
  }

  async findPlatformById(
    ruleId: string
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    return this.rules.find((rule) => rule.id === ruleId) ?? null;
  }

  async findPlatformByCategoryId(
    categoryId: string
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    return this.rules.find((rule) => rule.categoryId === categoryId) ?? null;
  }

  async updatePlatform(
    input: UpdatePlatformCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    const rule = await this.findPlatformById(input.ruleId);

    if (!rule) {
      return null;
    }

    rule.categoryId = input.categoryId ?? rule.categoryId;
    rule.categoryName =
      rule.categoryId === "category-2" ? "Furniture" : "Electronics";
    rule.methodType = input.methodType ?? rule.methodType;
    rule.value = input.value ?? rule.value;
    rule.updatedAt = new Date("2026-04-02T01:00:00.000Z");

    return rule;
  }

  async updatePlatformStatus(
    input: UpdatePlatformCategoryShippingRuleStatusInput
  ): Promise<CategoryShippingRuleDetailRecord | null> {
    const rule = await this.findPlatformById(input.ruleId);

    if (!rule) {
      return null;
    }

    rule.status = input.status;
    rule.updatedAt = new Date("2026-04-02T02:00:00.000Z");

    return rule;
  }
}

describe("category shipping rule admin use cases", () => {
  it("creates a new category shipping rule", async () => {
    const createCategoryShippingRule = new CreateCategoryShippingRule(
      new CategoryShippingRuleRepositoryDouble(),
      new ProductCategoryRepositoryDouble()
    );

    const rule = await createCategoryShippingRule.execute({
      categoryId: "category-2",
      methodType: "percentage_based",
      value: 10
    });

    expect(rule.categoryId).toBe("category-2");
    expect(rule.methodType).toBe("percentage_based");
  });

  it("throws when creating a category shipping rule for a missing category", async () => {
    const createCategoryShippingRule = new CreateCategoryShippingRule(
      new CategoryShippingRuleRepositoryDouble(),
      new ProductCategoryRepositoryDouble()
    );

    await expect(
      createCategoryShippingRule.execute({
        categoryId: "missing-category",
        methodType: "fixed_rate",
        value: 1000
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("throws when creating a second platform category rule for the same category", async () => {
    const createCategoryShippingRule = new CreateCategoryShippingRule(
      new CategoryShippingRuleRepositoryDouble(),
      new ProductCategoryRepositoryDouble()
    );

    await expect(
      createCategoryShippingRule.execute({
        categoryId: "category-1",
        methodType: "fixed_rate",
        value: 1000
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("throws when a percentage-based category rule exceeds 100", async () => {
    const createCategoryShippingRule = new CreateCategoryShippingRule(
      new CategoryShippingRuleRepositoryDouble(),
      new ProductCategoryRepositoryDouble()
    );

    await expect(
      createCategoryShippingRule.execute({
        categoryId: "category-2",
        methodType: "percentage_based",
        value: 101
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("lists the existing category shipping rules", async () => {
    const listCategoryShippingRules = new ListCategoryShippingRules(
      new CategoryShippingRuleRepositoryDouble()
    );

    const rules = await listCategoryShippingRules.execute();

    expect(rules).toHaveLength(1);
    expect(rules[0].categoryName).toBe("Electronics");
  });

  it("throws when a requested category shipping rule does not exist", async () => {
    const getCategoryShippingRule = new GetCategoryShippingRule(
      new CategoryShippingRuleRepositoryDouble()
    );

    await expect(
      getCategoryShippingRule.execute({ ruleId: "missing-rule" })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("updates a category shipping rule", async () => {
    const updateCategoryShippingRule = new UpdateCategoryShippingRule(
      new CategoryShippingRuleRepositoryDouble(),
      new ProductCategoryRepositoryDouble()
    );

    const rule = await updateCategoryShippingRule.execute({
      ruleId: "rule-1",
      methodType: "percentage_based",
      value: 15
    });

    expect(rule.methodType).toBe("percentage_based");
    expect(rule.value).toBe(15);
  });

  it("throws when updating a category shipping rule without any fields", async () => {
    const updateCategoryShippingRule = new UpdateCategoryShippingRule(
      new CategoryShippingRuleRepositoryDouble(),
      new ProductCategoryRepositoryDouble()
    );

    await expect(
      updateCategoryShippingRule.execute({ ruleId: "rule-1" })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("throws when updating a category shipping rule to a missing category", async () => {
    const updateCategoryShippingRule = new UpdateCategoryShippingRule(
      new CategoryShippingRuleRepositoryDouble(),
      new ProductCategoryRepositoryDouble()
    );

    await expect(
      updateCategoryShippingRule.execute({
        ruleId: "rule-1",
        categoryId: "missing-category"
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("updates the category shipping rule status", async () => {
    const setCategoryShippingRuleStatus = new SetCategoryShippingRuleStatus(
      new CategoryShippingRuleRepositoryDouble()
    );

    const rule = await setCategoryShippingRuleStatus.execute({
      ruleId: "rule-1",
      status: "inactive" satisfies ShippingRuleStatus
    });

    expect(rule.status).toBe("inactive");
  });

  it("throws when updating the status of a missing category shipping rule", async () => {
    const setCategoryShippingRuleStatus = new SetCategoryShippingRuleStatus(
      new CategoryShippingRuleRepositoryDouble()
    );

    await expect(
      setCategoryShippingRuleStatus.execute({
        ruleId: "missing-rule",
        status: "inactive"
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });
});
