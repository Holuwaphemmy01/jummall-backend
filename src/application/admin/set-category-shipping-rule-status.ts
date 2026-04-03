import type {
  CategoryShippingRuleDetailRecord,
  ShippingRuleStatus
} from "../../ports/shipping/shipping-models";
import type { CategoryShippingRuleRepository } from "../../ports/shipping/category-shipping-rule-repository";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface SetCategoryShippingRuleStatusInput {
  ruleId: string;
  status: ShippingRuleStatus;
}

export interface SetCategoryShippingRuleStatusUseCase {
  execute(
    input: SetCategoryShippingRuleStatusInput
  ): Promise<CategoryShippingRuleDetailRecord>;
}

export class SetCategoryShippingRuleStatus
  implements SetCategoryShippingRuleStatusUseCase
{
  constructor(
    private readonly categoryShippingRuleRepository: CategoryShippingRuleRepository
  ) {}

  async execute(
    input: SetCategoryShippingRuleStatusInput
  ): Promise<CategoryShippingRuleDetailRecord> {
    const updatedRule =
      await this.categoryShippingRuleRepository.updatePlatformStatus(input);

    if (!updatedRule) {
      throw new ShippingConfigurationError(
        "Category shipping rule not found.",
        404
      );
    }

    return updatedRule;
  }
}
