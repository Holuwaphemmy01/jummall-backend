import type { FreeShippingRuleRepository } from "../../ports/shipping/free-shipping-rule-repository";
import type { FreeShippingRuleRecord } from "../../ports/shipping/shipping-models";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface GetFreeShippingRuleInput {
  ruleId: string;
}

export interface GetFreeShippingRuleUseCase {
  execute(input: GetFreeShippingRuleInput): Promise<FreeShippingRuleRecord>;
}

export class GetFreeShippingRule implements GetFreeShippingRuleUseCase {
  constructor(
    private readonly freeShippingRuleRepository: FreeShippingRuleRepository
  ) {}

  async execute(
    input: GetFreeShippingRuleInput
  ): Promise<FreeShippingRuleRecord> {
    const rule = await this.freeShippingRuleRepository.findById(input.ruleId);

    if (!rule) {
      throw new ShippingConfigurationError("Free shipping rule not found.", 404);
    }

    return rule;
  }
}
