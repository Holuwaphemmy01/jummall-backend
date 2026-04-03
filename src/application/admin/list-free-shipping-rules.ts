import type { FreeShippingRuleRepository } from "../../ports/shipping/free-shipping-rule-repository";
import type { FreeShippingRuleRecord } from "../../ports/shipping/shipping-models";

export interface ListFreeShippingRulesUseCase {
  execute(): Promise<FreeShippingRuleRecord[]>;
}

export class ListFreeShippingRules implements ListFreeShippingRulesUseCase {
  constructor(
    private readonly freeShippingRuleRepository: FreeShippingRuleRepository
  ) {}

  execute(): Promise<FreeShippingRuleRecord[]> {
    return this.freeShippingRuleRepository.findAll();
  }
}
