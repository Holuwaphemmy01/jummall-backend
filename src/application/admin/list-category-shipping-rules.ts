import type { CategoryShippingRuleDetailRecord } from "../../ports/shipping/shipping-models";
import type { CategoryShippingRuleRepository } from "../../ports/shipping/category-shipping-rule-repository";

export interface ListCategoryShippingRulesUseCase {
  execute(): Promise<CategoryShippingRuleDetailRecord[]>;
}

export class ListCategoryShippingRules
  implements ListCategoryShippingRulesUseCase
{
  constructor(
    private readonly categoryShippingRuleRepository: CategoryShippingRuleRepository
  ) {}

  async execute(): Promise<CategoryShippingRuleDetailRecord[]> {
    return this.categoryShippingRuleRepository.findAllPlatform();
  }
}
