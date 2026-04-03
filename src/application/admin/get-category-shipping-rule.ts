import type { CategoryShippingRuleDetailRecord } from "../../ports/shipping/shipping-models";
import type { CategoryShippingRuleRepository } from "../../ports/shipping/category-shipping-rule-repository";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface GetCategoryShippingRuleInput {
  ruleId: string;
}

export interface GetCategoryShippingRuleUseCase {
  execute(
    input: GetCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord>;
}

export class GetCategoryShippingRule implements GetCategoryShippingRuleUseCase {
  constructor(
    private readonly categoryShippingRuleRepository: CategoryShippingRuleRepository
  ) {}

  async execute(
    input: GetCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord> {
    const rule = await this.categoryShippingRuleRepository.findPlatformById(
      input.ruleId
    );

    if (!rule) {
      throw new ShippingConfigurationError(
        "Category shipping rule not found.",
        404
      );
    }

    return rule;
  }
}
