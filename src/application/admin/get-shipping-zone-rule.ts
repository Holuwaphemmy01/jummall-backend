import type { ShippingZoneRuleDetailRecord } from "../../ports/shipping/shipping-models";
import type { ShippingZoneRuleRepository } from "../../ports/shipping/shipping-zone-rule-repository";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface GetShippingZoneRuleInput {
  ruleId: string;
}

export interface GetShippingZoneRuleUseCase {
  execute(input: GetShippingZoneRuleInput): Promise<ShippingZoneRuleDetailRecord>;
}

export class GetShippingZoneRule implements GetShippingZoneRuleUseCase {
  constructor(
    private readonly shippingZoneRuleRepository: ShippingZoneRuleRepository
  ) {}

  async execute(
    input: GetShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    const rule = await this.shippingZoneRuleRepository.findPlatformById(
      input.ruleId
    );

    if (!rule) {
      throw new ShippingConfigurationError("Shipping zone rule not found.", 404);
    }

    return rule;
  }
}
