import type {
  ShippingRuleStatus,
  ShippingZoneRuleDetailRecord
} from "../../ports/shipping/shipping-models";
import type { ShippingZoneRuleRepository } from "../../ports/shipping/shipping-zone-rule-repository";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface SetShippingZoneRuleStatusInput {
  ruleId: string;
  status: ShippingRuleStatus;
}

export interface SetShippingZoneRuleStatusUseCase {
  execute(input: SetShippingZoneRuleStatusInput): Promise<ShippingZoneRuleDetailRecord>;
}

export class SetShippingZoneRuleStatus
  implements SetShippingZoneRuleStatusUseCase
{
  constructor(
    private readonly shippingZoneRuleRepository: ShippingZoneRuleRepository
  ) {}

  async execute(
    input: SetShippingZoneRuleStatusInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    const updatedRule = await this.shippingZoneRuleRepository.updatePlatformStatus(
      input
    );

    if (!updatedRule) {
      throw new ShippingConfigurationError("Shipping zone rule not found.", 404);
    }

    return updatedRule;
  }
}
