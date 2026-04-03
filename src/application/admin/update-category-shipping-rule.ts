import type { ProductCategoryRepository } from "../../ports/product-category-repository";
import type {
  CategoryShippingRuleDetailRecord,
  ShippingMethodType
} from "../../ports/shipping/shipping-models";
import type { CategoryShippingRuleRepository } from "../../ports/shipping/category-shipping-rule-repository";
import { assertValidShippingRuleValue } from "./shipping-configuration-helpers";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface UpdateCategoryShippingRuleInput {
  ruleId: string;
  categoryId?: string;
  methodType?: ShippingMethodType;
  value?: number;
}

export interface UpdateCategoryShippingRuleUseCase {
  execute(
    input: UpdateCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord>;
}

export class UpdateCategoryShippingRule
  implements UpdateCategoryShippingRuleUseCase
{
  constructor(
    private readonly categoryShippingRuleRepository: CategoryShippingRuleRepository,
    private readonly productCategoryRepository: ProductCategoryRepository
  ) {}

  async execute(
    input: UpdateCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord> {
    if (
      input.categoryId === undefined &&
      input.methodType === undefined &&
      input.value === undefined
    ) {
      throw new ShippingConfigurationError(
        "At least one category shipping rule field must be provided.",
        400
      );
    }

    const existingRule = await this.categoryShippingRuleRepository.findPlatformById(
      input.ruleId
    );

    if (!existingRule) {
      throw new ShippingConfigurationError(
        "Category shipping rule not found.",
        404
      );
    }

    const nextCategoryId = input.categoryId ?? existingRule.categoryId;
    const category = await this.productCategoryRepository.findById(nextCategoryId);

    if (!category) {
      throw new ShippingConfigurationError(
        "Product category not found.",
        404,
        "category_id"
      );
    }

    if (nextCategoryId !== existingRule.categoryId) {
      const ruleForCategory =
        await this.categoryShippingRuleRepository.findPlatformByCategoryId(
          nextCategoryId
        );

      if (ruleForCategory) {
        throw new ShippingConfigurationError(
          "A platform category shipping rule already exists for this category.",
          409,
          "category_id"
        );
      }
    }

    const nextMethodType = input.methodType ?? existingRule.methodType;
    const nextValue = input.value ?? existingRule.value;

    assertValidShippingRuleValue(nextMethodType, nextValue);

    const updatedRule = await this.categoryShippingRuleRepository.updatePlatform(
      {
        ruleId: input.ruleId,
        categoryId: input.categoryId,
        methodType: input.methodType,
        value: input.value
      }
    );

    if (!updatedRule) {
      throw new ShippingConfigurationError(
        "Category shipping rule not found.",
        404
      );
    }

    return updatedRule;
  }
}
