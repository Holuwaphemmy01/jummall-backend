import type { FreeShippingRuleRepository } from "../../ports/shipping/free-shipping-rule-repository";
import type {
  FreeShippingRuleRecord,
  FreeShippingRuleStatus
} from "../../ports/shipping/shipping-models";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface SetFreeShippingRuleStatusInput {
  ruleId: string;
  status: FreeShippingRuleStatus;
}

export interface SetFreeShippingRuleStatusUseCase {
  execute(input: SetFreeShippingRuleStatusInput): Promise<FreeShippingRuleRecord>;
}

export class SetFreeShippingRuleStatus
  implements SetFreeShippingRuleStatusUseCase
{
  constructor(
    private readonly freeShippingRuleRepository: FreeShippingRuleRepository
  ) {}

  async execute(
    input: SetFreeShippingRuleStatusInput
  ): Promise<FreeShippingRuleRecord> {
    const existingRule = await this.freeShippingRuleRepository.findById(input.ruleId);

    if (!existingRule) {
      throw new ShippingConfigurationError("Free shipping rule not found.", 404);
    }

    if (input.status === "active" && existingRule.type === "threshold") {
      const activeThresholdRule =
        await this.freeShippingRuleRepository.findActiveThresholdRule();

      if (activeThresholdRule && activeThresholdRule.id !== input.ruleId) {
        throw new ShippingConfigurationError(
          "An active threshold free shipping rule already exists.",
          409,
          "status"
        );
      }
    }

    const updatedRule = await this.freeShippingRuleRepository.updateStatus(input);

    if (!updatedRule) {
      throw new ShippingConfigurationError("Free shipping rule not found.", 404);
    }

    return updatedRule;
  }
}
